/**
 * engine/storage.ts — the only file that touches localStorage.
 *
 * Schema version is explicit and global. Migrations are numbered functions
 * run in order, and the version is written only after all of them succeed.
 * The injectable driver lets tests exercise migrations against memory.
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

let namespace = '';

export function configureNamespace(value: string): void {
  namespace = value;
}

export function key(name: string, id?: string): string {
  return `${namespace}${name}${id === undefined ? '' : `_${id}`}`;
}

/** Starts empty. Projects provide their own numbered migrations. */
export const CURRENT_SCHEMA_VERSION = 0;

let driver: KeyValueDriver =
  typeof localStorage !== 'undefined' ? localStorage : memoryDriver();

export const setDriver = (next: KeyValueDriver): void => { driver = next; };
export const getDriver = (): KeyValueDriver => driver;

export function read<T>(storageKey: string, fallback: T): T {
  try {
    const raw = driver.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write(storageKey: string, value: unknown): boolean {
  try {
    driver.setItem(storageKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const remove = (storageKey: string): void => { driver.removeItem(storageKey); };

/** Snapshot first so callers may delete while iterating without skipping. */
export function keysWithPrefix(prefix: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < driver.length; i++) {
    const storageKey = driver.key(i);
    if (storageKey && storageKey.startsWith(prefix)) out.push(storageKey);
  }
  return out;
}

export interface MigrationReport {
  from: number;
  to: number;
  applied: string[];
  notes: string[];
}

export type Migration = { name: string; run: (notes: string[]) => void };

export const MIGRATIONS: readonly Migration[] = [];

/** Idempotent. Safe to call on every page load. */
export function migrate(
  registered: readonly Migration[] = MIGRATIONS,
  currentSchemaVersion = registered.length,
): MigrationReport {
  const versionKey = key('schema_version');
  const from = read<number>(versionKey, CURRENT_SCHEMA_VERSION);
  const report: MigrationReport = { from, to: from, applied: [], notes: [] };
  if (from >= currentSchemaVersion) return report;

  for (let i = from; i < registered.length; i++) {
    const migration = registered[i]!;
    migration.run(report.notes);
    report.applied.push(migration.name);
  }
  write(versionKey, currentSchemaVersion);
  report.to = currentSchemaVersion;
  return report;
}

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 11)}`;

export const now = (): string => new Date().toISOString();
