export interface KeyValueDriver {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface Migration {
  readonly version: number;
  readonly migrate: (driver: KeyValueDriver) => void;
}

export interface MigrationReport {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly applied: readonly number[];
}

export const CURRENT_SCHEMA_VERSION = 0;
export const migrations: Migration[] = [];

let namespace = '';

const browserDriver = (): KeyValueDriver => {
  if (typeof localStorage === 'undefined') return memoryDriver();
  return localStorage;
};

let driver: KeyValueDriver = browserDriver();

export function configureNamespace(value: string): void {
  namespace = value;
}

export function key(name: string, id?: string): string {
  return `${namespace}${name}${id === undefined ? '' : `_${id}`}`;
}

export function memoryDriver(): KeyValueDriver {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(name) { return values.get(name) ?? null; },
    setItem(name, value) { values.set(name, value); },
    removeItem(name) { values.delete(name); },
  };
}

export function setDriver(next: KeyValueDriver): void {
  driver = next;
}

export function getDriver(): KeyValueDriver {
  return driver;
}

export function read<T>(storageKey: string, fallback: T): T {
  const value = driver.getItem(storageKey);
  if (value === null) return fallback;
  try { return JSON.parse(value) as T; }
  catch { return fallback; }
}

export function write<T>(storageKey: string, value: T): void {
  driver.setItem(storageKey, JSON.stringify(value));
}

export function remove(storageKey: string): void {
  driver.removeItem(storageKey);
}

export function keysWithPrefix(prefix: string): string[] {
  const keys: string[] = [];
  for (let index = 0; index < driver.length; index += 1) {
    const candidate = driver.key(index);
    if (candidate?.startsWith(prefix)) keys.push(candidate);
  }
  return keys;
}

export function runMigrations(
  registered: readonly Migration[] = migrations,
  currentVersion = registered.reduce(
    (highest, migration) => Math.max(highest, migration.version),
    CURRENT_SCHEMA_VERSION,
  ),
): MigrationReport {
  const versionKey = key('schema_version');
  const fromVersion = read(versionKey, 0);
  const pending = [...registered]
    .filter(({ version }) => version > fromVersion && version <= currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) migration.migrate(driver);
  if (pending.length > 0) write(versionKey, currentVersion);

  return {
    fromVersion,
    toVersion: pending.length > 0 ? currentVersion : fromVersion,
    applied: pending.map(({ version }) => version),
  };
}
