/**
 * engine/remote-storage.ts — a state backend that talks to a server.
 *
 * Extracted from a deployed Cloudflare project. Every step in the write path
 * exists because something went wrong without it:
 *
 *   debounce      — a keystroke is not a request.
 *   coalesce      — only the newest snapshot matters; older ones are dead.
 *   single-flight — two overlapping POSTs can land out of order.
 *   re-arm        — work that arrived mid-flight must not be dropped.
 *   retry once    — one transient failure should not surface as an error.
 *
 * `load()` clears the pending timer and snapshot before fetching, so a queued
 * save can never overwrite state that was just loaded.
 */

import type { StorageBackend } from './state-backend.ts';

export interface RemoteStorageMessages {
  readonly loadFailed: string;
  readonly saveFailed: string;
  readonly migrateFailed: string;
  readonly missingLocalState: string;
  readonly invalidLocalState: string;
  readonly migrateUnavailable: string;
}

const DEFAULT_MESSAGES: RemoteStorageMessages = {
  loadFailed: 'Could not load state.',
  saveFailed: 'Could not save state.',
  migrateFailed: 'Migration failed.',
  missingLocalState: 'No local state found.',
  invalidLocalState: 'The local state is invalid.',
  migrateUnavailable: 'No migration endpoint is configured.',
};

export interface RemoteStorageOptions<T> {
  /** Endpoint answering GET with the state and accepting POST of a snapshot. */
  readonly stateUrl: string;
  /** Endpoint that seeds an empty server from local state. Optional. */
  readonly migrateUrl?: string;
  /** Called when a save fails after its retry. Saves never throw at callers. */
  onError(message: string): void;
  readonly debounceMs?: number;
  readonly retryDelayMs?: number;
  /** Turns a server payload into state. Defaults to using it unchanged. */
  normalize?(payload: unknown): T;
  /** Returns locally stored state as raw JSON, enabling `migrateFromLocal`. */
  readLocalState?(): string | null;
  readonly messages?: Partial<RemoteStorageMessages>;
  /** Injected for tests and non-browser hosts. Defaults to global `fetch`. */
  fetch?(input: string, init?: RequestInit): Promise<Response>;
}

export class RemoteStorageBackend<T> implements StorageBackend<T> {
  readonly kind = 'remote' as const;
  private pending: T | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private saving = false;
  private remoteEmpty = false;
  private readonly debounceMs: number;
  private readonly retryDelayMs: number;
  private readonly messages: RemoteStorageMessages;
  private readonly options: RemoteStorageOptions<T>;

  constructor(options: RemoteStorageOptions<T>) {
    this.options = options;
    this.debounceMs = options.debounceMs ?? 300;
    this.retryDelayMs = options.retryDelayMs ?? 250;
    this.messages = { ...DEFAULT_MESSAGES, ...options.messages };
  }

  /** True when the server reported `meta.empty` on the last load. */
  get isEmpty(): boolean { return this.remoteEmpty; }

  /** True when the server is empty and this browser still holds state. */
  get hasLocalMigration(): boolean { return this.remoteEmpty && this.readLocal() !== null; }

  async load(): Promise<T> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.pending = null;
    const payload = await this.withRetry(async () => {
      const response = await this.request(this.options.stateUrl, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(await responseMessage(response, this.messages.loadFailed));
      return response.json() as Promise<unknown>;
    });
    this.remoteEmpty = isRecord(payload) && isRecord(payload['meta']) && payload['meta']['empty'] === true;
    return this.normalize(payload);
  }

  /** Schedules a write. Returns as soon as the snapshot is queued. */
  async save(state: T): Promise<void> {
    this.pending = clone(state);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, this.debounceMs);
  }

  /** Seeds an empty server from local state, then reloads from the server. */
  async migrateFromLocal(): Promise<T> {
    const migrateUrl = this.options.migrateUrl;
    if (!migrateUrl) throw new Error(this.messages.migrateUnavailable);
    const raw = this.readLocal();
    if (!raw) throw new Error(this.messages.missingLocalState);
    let state: T;
    try { state = this.normalize(JSON.parse(raw)); } catch { throw new Error(this.messages.invalidLocalState); }
    await this.withRetry(async () => {
      const response = await this.request(migrateUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(state),
      });
      if (!response.ok) throw new Error(await responseMessage(response, this.messages.migrateFailed));
    });
    return this.load();
  }

  private async flush(): Promise<void> {
    if (this.saving || !this.pending) return;
    const snapshot = this.pending;
    this.pending = null;
    this.saving = true;
    try {
      await this.withRetry(async () => {
        const response = await this.request(this.options.stateUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(snapshot),
        });
        if (!response.ok) throw new Error(await responseMessage(response, this.messages.saveFailed));
      });
    } catch (cause) {
      this.options.onError(cause instanceof Error ? cause.message : this.messages.saveFailed);
    } finally {
      this.saving = false;
      if (this.pending) {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, this.debounceMs);
      }
    }
  }

  private async withRetry<R>(operation: () => Promise<R>): Promise<R> {
    try { return await operation(); } catch {
      await delay(this.retryDelayMs);
      return operation();
    }
  }

  /** Resolved per call so a host may replace global `fetch` after construction. */
  private request(input: string, init?: RequestInit): Promise<Response> {
    const injected = this.options.fetch;
    return injected ? injected(input, init) : globalThis.fetch(input, init);
  }

  private normalize(payload: unknown): T {
    return this.options.normalize ? this.options.normalize(payload) : (payload as T);
  }

  private readLocal(): string | null {
    return this.options.readLocalState?.() ?? null;
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(state: T): T => JSON.parse(JSON.stringify(state)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** The server's own `error` field is more useful than a generic fallback. */
async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    return isRecord(body) && typeof body['error'] === 'string' ? body['error'] : fallback;
  } catch { return fallback; }
}
