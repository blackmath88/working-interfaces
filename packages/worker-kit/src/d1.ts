/**
 * d1.ts — the two write patterns worth carrying between projects.
 *
 * 1. Mark and sweep. Stamp every existing row as stale, upsert the full
 *    current set with a real timestamp, delete whatever still carries the
 *    stale mark. One `db.batch()` replaces the whole state without diffing,
 *    and deletions fall out for free instead of needing to be detected.
 *
 * 2. Variable-limit chunking. D1 caps bound variables per statement, so a
 *    multi-row INSERT has to be split by column count rather than row count.
 *    Forgetting this produces a failure that only appears once the data grows.
 *
 * Table and column names are parameters. Schemas belong to projects: this file
 * knows nothing about what is being stored, only that each table has an id, a
 * timestamp column to mark with, and optionally a version counter.
 */

export type ColumnValue = string | number | null;
export type Row = Record<string, ColumnValue>;

/** D1 rejects a statement carrying more bound variables than this. */
export const D1_MAX_BOUND_VARIABLES = 100;

export interface TableOptions {
  /** Column stamped with the batch timestamp and blanked to mark staleness. */
  readonly stampColumn?: string;
  /** Incremented on every upsert. Pass null for tables without a counter. */
  readonly versionColumn?: string | null;
  readonly idColumn?: string;
  readonly maxBoundVariables?: number;
}

export interface TableRows {
  readonly table: string;
  readonly rows: readonly Row[];
}

export interface MetaOptions {
  readonly table?: string;
  readonly keyColumn?: string;
  readonly valueColumn?: string;
}

/**
 * How many rows fit in one statement. Each row binds one variable per column,
 * so the limit divides by width, not by length.
 */
export function rowsPerStatement(columnCount: number, maxBoundVariables = D1_MAX_BOUND_VARIABLES): number {
  return Math.max(1, Math.floor(maxBoundVariables / Math.max(1, columnCount)));
}

/** Blanks the stamp column so every current row looks stale. */
export function markStale(db: D1Database, table: string, options: TableOptions = {}): D1PreparedStatement {
  const stamp = identifier(options.stampColumn ?? 'updated_at');
  return db.prepare(`UPDATE ${identifier(table)} SET ${stamp} = ''`);
}

/** Removes whatever the upserts did not refresh. */
export function deleteStale(db: D1Database, table: string, options: TableOptions = {}): D1PreparedStatement {
  const stamp = identifier(options.stampColumn ?? 'updated_at');
  return db.prepare(`DELETE FROM ${identifier(table)} WHERE ${stamp} = ''`);
}

/** Chunked multi-row upsert. Every row is stamped with the batch timestamp. */
export function upsertMany(
  db: D1Database,
  table: string,
  values: readonly Row[],
  stamp: string,
  options: TableOptions = {},
): D1PreparedStatement[] {
  if (!values.length) return [];
  const stampColumn = options.stampColumn ?? 'updated_at';
  const versionColumn = options.versionColumn === undefined ? 'version' : options.versionColumn;
  const idColumn = options.idColumn ?? 'id';
  const safeTable = identifier(table);

  const rows: Row[] = values.map((row) => ({ ...row, [stampColumn]: stamp }));
  const safeId = identifier(idColumn);
  const columns = Object.keys(rows[0]!).map(identifier);
  const perStatement = rowsPerStatement(columns.length, options.maxBoundVariables);

  const assignments = columns
    .filter((column) => column !== safeId)
    .map((column) => `${column}=excluded.${column}`);
  if (versionColumn) {
    const safeVersion = identifier(versionColumn);
    assignments.push(`${safeVersion}=${safeTable}.${safeVersion} + 1`);
  }

  const statements: D1PreparedStatement[] = [];
  for (let start = 0; start < rows.length; start += perStatement) {
    const chunk = rows.slice(start, start + perStatement);
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
    const bindings = chunk.flatMap((row) => columns.map((column) => row[column] ?? null));
    statements.push(
      db.prepare(
        `INSERT INTO ${safeTable} (${columns.join(',')}) VALUES ${placeholders}`
        + ` ON CONFLICT(${safeId}) DO UPDATE SET ${assignments.join(',')}`,
      ).bind(...bindings),
    );
  }
  return statements;
}

/**
 * The full mark-and-sweep statement list, in the order it must run: every
 * table is marked before any row is written, so a row moving between tables
 * cannot be swept away after it was refreshed.
 */
export function replaceTables(
  db: D1Database,
  tables: readonly TableRows[],
  stamp: string,
  options: TableOptions = {},
): D1PreparedStatement[] {
  return [
    ...tables.map(({ table }) => markStale(db, table, options)),
    ...tables.flatMap(({ table, rows }) => upsertMany(db, table, rows, stamp, options)),
    ...tables.map(({ table }) => deleteStale(db, table, options)),
  ];
}

export interface ReplaceResult {
  readonly stamp: string;
  readonly counts: Record<string, number>;
}

/** Runs a replacement, plus any project statements, as one batch. */
export async function runReplace(
  db: D1Database,
  tables: readonly TableRows[],
  stamp: string,
  extra: readonly D1PreparedStatement[] = [],
  options: TableOptions = {},
): Promise<ReplaceResult> {
  await db.batch([...replaceTables(db, tables, stamp, options), ...extra]);
  const counts: Record<string, number> = {};
  for (const { table, rows } of tables) counts[table] = rows.length;
  return { stamp, counts };
}

export function upsertMeta(db: D1Database, key: string, value: string, options: MetaOptions = {}): D1PreparedStatement {
  const table = identifier(options.table ?? 'meta');
  const keyColumn = identifier(options.keyColumn ?? 'key');
  const valueColumn = identifier(options.valueColumn ?? 'value');
  return db
    .prepare(`INSERT INTO ${table} (${keyColumn}, ${valueColumn}) VALUES (?, ?)`
      + ` ON CONFLICT(${keyColumn}) DO UPDATE SET ${valueColumn}=excluded.${valueColumn}`)
    .bind(key, value);
}

export async function readMeta(db: D1Database, options: MetaOptions = {}): Promise<Map<string, string>> {
  const table = identifier(options.table ?? 'meta');
  const keyColumn = identifier(options.keyColumn ?? 'key');
  const valueColumn = identifier(options.valueColumn ?? 'value');
  const result = await db.prepare(`SELECT ${keyColumn}, ${valueColumn} FROM ${table}`)
    .all<Record<string, string>>();
  return new Map(result.results.map((row) => [row[keyColumn]!, row[valueColumn]!]));
}

/** A first run has to be recognisable, so migrate-from-local can be offered. */
export async function isTableEmpty(db: D1Database, table: string): Promise<boolean> {
  const row = await db.prepare(`SELECT COUNT(*) AS count FROM ${identifier(table)}`).first<{ count: number }>();
  return Number(row?.count ?? 0) === 0;
}

/**
 * Identifiers are interpolated into SQL because they cannot be bound. They now
 * arrive as arguments rather than as literals in this file, so they are
 * checked rather than trusted.
 */
function identifier(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`"${name}" is not a valid SQL identifier.`);
  }
  return name;
}
