/**
 * engine/storage.ts — the only file that touches key-value storage.
 *
 * Storage is an instance, not a module. `createStorage` binds a driver and a
 * namespace together and returns an independent handle; there is no
 * module-level driver, so two parts of an application that need different
 * backing stores simply hold two handles.
 *
 * Schema version is explicit and checkpointed. Migrations are numbered
 * functions run in order, and the version is written after *each* one
 * succeeds. A failure therefore stops the run at a known version, and no
 * migration ever runs twice.
 */

export interface KeyValueDriver {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export const memoryDriver = (seed: Record<string, string> = {}): KeyValueDriver => {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
};

/** Browser persistence, offered but never assumed. Pass it in explicitly. */
export function localStorageDriver(): KeyValueDriver {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is unavailable here. Pass memoryDriver() instead.');
  }
  return localStorage;
}

/** Starts empty. Projects provide their own numbered migrations. */
export const CURRENT_SCHEMA_VERSION = 0;

export type Migration = { name: string; run: (notes: string[]) => void };

export const MIGRATIONS: readonly Migration[] = [];

/** The migration that stopped the run, and the version it would have produced. */
export interface MigrationFailure {
  readonly name: string;
  /** Zero-based position in the registered list. Its version would be index + 1. */
  readonly index: number;
  readonly error: Error;
}

export interface MigrationReport {
  /** Version the run started from. */
  from: number;
  /** Version actually reached and written. Equals `from` when the first step fails. */
  to: number;
  /** Migrations that succeeded and were checkpointed, in order. */
  applied: string[];
  /** The migration that threw, or null when the run completed. */
  failed: MigrationFailure | null;
  notes: string[];
}

export interface StorageOptions {
  readonly driver: KeyValueDriver;
  readonly namespace?: string;
}

export interface KeyValueStorage {
  readonly driver: KeyValueDriver;
  readonly namespace: string;
  key(name: string, id?: string): string;
  read<T>(storageKey: string, fallback: T): T;
  write(storageKey: string, value: unknown): boolean;
  remove(storageKey: string): void;
  keysWithPrefix(prefix: string): string[];
  migrate(registered?: readonly Migration[], currentSchemaVersion?: number): MigrationReport;
}

export function createStorage({ driver, namespace = '' }: StorageOptions): KeyValueStorage {
  const key = (name: string, id?: string): string =>
    `${namespace}${name}${id === undefined ? '' : `_${id}`}`;

  function read<T>(storageKey: string, fallback: T): T {
    try {
      const raw = driver.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(storageKey: string, value: unknown): boolean {
    try {
      driver.setItem(storageKey, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /** Snapshot first so callers may delete while iterating without skipping. */
  function keysWithPrefix(prefix: string): string[] {
    const out: string[] = [];
    for (let i = 0; i < driver.length; i++) {
      const storageKey = driver.key(i);
      if (storageKey && storageKey.startsWith(prefix)) out.push(storageKey);
    }
    return out;
  }

  /**
   * Safe to call on every page load. Each migration is checkpointed the moment
   * it succeeds, so a later failure leaves the earlier steps recorded as done
   * and the next run resumes at the step that failed.
   */
  function migrate(
    registered: readonly Migration[] = MIGRATIONS,
    currentSchemaVersion = registered.length,
  ): MigrationReport {
    const versionKey = key('schema_version');
    const from = read<number>(versionKey, CURRENT_SCHEMA_VERSION);
    const report: MigrationReport = { from, to: from, applied: [], failed: null, notes: [] };
    if (from >= currentSchemaVersion) return report;

    for (let index = from; index < registered.length && index < currentSchemaVersion; index++) {
      const migration = registered[index]!;
      try {
        migration.run(report.notes);
      } catch (cause) {
        report.failed = {
          name: migration.name,
          index,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        };
        return report;
      }
      write(versionKey, index + 1);
      report.applied.push(migration.name);
      report.to = index + 1;
    }

    /** A declared version ahead of the registered list still settles there. */
    if (currentSchemaVersion > report.to) {
      write(versionKey, currentSchemaVersion);
      report.to = currentSchemaVersion;
    }
    return report;
  }

  const remove = (storageKey: string): void => { driver.removeItem(storageKey); };

  return { driver, namespace, key, read, write, remove, keysWithPrefix, migrate };
}

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 11)}`;

export const now = (): string => new Date().toISOString();
