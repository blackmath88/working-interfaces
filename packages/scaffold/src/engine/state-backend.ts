/**
 * engine/state-backend.ts — whole-state persistence contract.
 *
 * A backend loads and saves one application state value. The application does
 * not know which kind it holds: swapping a local backend for a remote one
 * changes no call site, which is what makes "start local, grow into a server"
 * a configuration change rather than a rewrite.
 *
 * This is deliberately a *different* model from `createStorage` in
 * `storage.ts`, which is a namespaced key-value store with numbered,
 * checkpointed migrations. A backend moves one blob; `createStorage` moves
 * many keys and can upgrade them in place. `LocalStorageBackend` bridges the
 * two by parking the blob under a single key, but the bridge is narrow: a
 * backend has no migration story of its own, and a project that needs one
 * either normalizes on read or uses `createStorage` directly. The two models
 * come from different projects and are not unified here.
 */

import type { KeyValueStorage } from './storage.ts';

export interface StorageBackend<T> {
  readonly kind: 'local' | 'remote';
  load(): Promise<T>;
  save(state: T): Promise<void>;
}

export interface LocalStorageBackendOptions<T> {
  /** Where the blob lives. Its driver decides memory versus browser storage. */
  readonly storage: KeyValueStorage;
  /** Key name inside the storage namespace. */
  readonly name?: string;
  /** Produces the state to return when nothing is stored yet. */
  fallback(): T;
  /** Runs on every load, so a project can upgrade an older on-disk shape. */
  normalize?(payload: unknown): T;
}

export class LocalStorageBackend<T> implements StorageBackend<T> {
  readonly kind = 'local' as const;
  private readonly storage: KeyValueStorage;
  private readonly stateKey: string;
  private readonly options: LocalStorageBackendOptions<T>;

  constructor(options: LocalStorageBackendOptions<T>) {
    this.options = options;
    this.storage = options.storage;
    this.stateKey = options.storage.key(options.name ?? 'state');
  }

  /** The stored key, exposed so a project can inspect or clear it. */
  get key(): string { return this.stateKey; }

  async load(): Promise<T> {
    const stored = this.storage.read<T | null>(this.stateKey, null);
    if (stored === null) return this.options.fallback();
    return this.options.normalize ? this.options.normalize(stored) : stored;
  }

  /**
   * `KeyValueStorage.write` reports failure by returning false — a full quota,
   * say. A backend's `save` returns void, so the signal would vanish; it is
   * raised instead.
   */
  async save(state: T): Promise<void> {
    if (!this.storage.write(this.stateKey, state)) {
      throw new Error(`Could not write state to "${this.stateKey}".`);
    }
  }
}
