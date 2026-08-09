import assert from 'node:assert/strict';
import test from 'node:test';

import { createPasswordGate } from '../src/auth.ts';
import { RequestError, errorResponse, json, readJsonBody } from '../src/http.ts';
import {
  isTableEmpty,
  markStale,
  readMeta,
  replaceTables,
  rowsPerStatement,
  runReplace,
  upsertMany,
  upsertMeta,
} from '../src/d1.ts';

/** Records the SQL and bindings a builder produces without touching a database. */
function fakeD1(results = []) {
  const statements = [];
  const db = {
    prepare(sql) {
      const statement = { sql, bindings: [] };
      statements.push(statement);
      return {
        bind(...bindings) { statement.bindings = bindings; return this; },
        async all() { return { results }; },
        async first() { return results[0]; },
      };
    },
    async batch(list) { return list.map(() => ({ success: true })); },
  };
  return { db, statements };
}

const columnsOf = (count) => Object.fromEntries(
  Array.from({ length: count }, (_, index) => [`c${index}`, `v${index}`]),
);

/* ── chunking ────────────────────────────────────────────────────── */

test('bound-variable limit divides by column count, not row count', () => {
  assert.equal(rowsPerStatement(12), 8, 'floor(100 / 12)');
  assert.equal(rowsPerStatement(1), 100);
  assert.equal(rowsPerStatement(100), 1);
  assert.equal(rowsPerStatement(140), 1, 'a very wide table still writes one row at a time');
});

test('a 12-column table splits 20 rows across 3 statements', () => {
  const { db } = fakeD1();
  // 11 own columns plus the stamp column the builder adds makes 12.
  const rows = Array.from({ length: 20 }, (_, index) => ({ id: `row-${index}`, ...columnsOf(10) }));
  const statements = upsertMany(db, 'items', rows, '2026-08-09T00:00:00.000Z');

  assert.equal(Object.keys({ ...rows[0], updated_at: 'x' }).length, 12, 'the test fixture is 12 columns wide');
  assert.equal(statements.length, 3, 'ceil(20 / 8)');
});

test('each chunk binds exactly its rows times its columns', () => {
  const { db, statements } = fakeD1();
  const rows = Array.from({ length: 20 }, (_, index) => ({ id: `row-${index}`, ...columnsOf(10) }));
  upsertMany(db, 'items', rows, 'stamp');

  assert.deepEqual(statements.map((statement) => statement.bindings.length), [96, 96, 48]);
  assert.equal(statements[0].bindings.length / 12, 8);
  assert.ok(statements.every((statement) => statement.bindings.length <= 100), 'no statement may exceed the D1 cap');
});

test('an empty table produces no upsert statements', () => {
  const { db, statements } = fakeD1();
  assert.deepEqual(upsertMany(db, 'items', [], 'stamp'), []);
  assert.deepEqual(statements, []);
});

/* ── mark and sweep ──────────────────────────────────────────────── */

test('mark and sweep marks every table before writing any row', () => {
  const { db, statements } = fakeD1();
  replaceTables(db, [
    { table: 'items', rows: [{ id: 'a' }] },
    { table: 'tags', rows: [{ id: 'b' }] },
  ], 'stamp');

  const shapes = statements.map((statement) => statement.sql.split(' ').slice(0, 2).join(' '));
  assert.deepEqual(shapes, ['UPDATE items', 'UPDATE tags', 'INSERT INTO', 'INSERT INTO', 'DELETE FROM', 'DELETE FROM']);
});

test('the stale mark is an empty stamp, and the sweep deletes exactly those rows', () => {
  const { db, statements } = fakeD1();
  replaceTables(db, [{ table: 'items', rows: [{ id: 'a' }] }], 'stamp');

  assert.equal(statements[0].sql, "UPDATE items SET updated_at = ''");
  assert.equal(statements[2].sql, "DELETE FROM items WHERE updated_at = ''");
});

test('the stamp column is a parameter', () => {
  const { db, statements } = fakeD1();
  markStale(db, 'items', { stampColumn: 'synced_at' });
  assert.equal(statements[0].sql, "UPDATE items SET synced_at = ''");
});

test('an upsert stamps the row and bumps the version counter', () => {
  const { db, statements } = fakeD1();
  upsertMany(db, 'items', [{ id: 'a', name: 'one' }], 'STAMP');

  assert.match(statements[0].sql, /INSERT INTO items \(id,name,updated_at\) VALUES \(\?,\?,\?\)/);
  assert.match(statements[0].sql, /ON CONFLICT\(id\) DO UPDATE SET name=excluded\.name,updated_at=excluded\.updated_at,version=items\.version \+ 1/);
  assert.deepEqual(statements[0].bindings, ['a', 'one', 'STAMP']);
});

test('the version counter can be turned off for tables without one', () => {
  const { db, statements } = fakeD1();
  upsertMany(db, 'items', [{ id: 'a' }], 'STAMP', { versionColumn: null });
  assert.doesNotMatch(statements[0].sql, /version/);
});

test('runReplace batches everything and reports row counts', async () => {
  const { db } = fakeD1();
  const result = await runReplace(db, [
    { table: 'items', rows: [{ id: 'a' }, { id: 'b' }] },
    { table: 'tags', rows: [] },
  ], 'STAMP', [upsertMeta(db, 'updated_at', 'STAMP')]);

  assert.equal(result.stamp, 'STAMP');
  assert.deepEqual(result.counts, { items: 2, tags: 0 });
});

test('identifiers are validated rather than trusted', () => {
  const { db } = fakeD1();
  assert.throws(() => markStale(db, 'items; DROP TABLE users'), /not a valid SQL identifier/);
  assert.throws(() => upsertMany(db, 'items', [{ id: 'a' }], 'x', { stampColumn: 'a b' }), /not a valid SQL identifier/);
});

/* ── meta table ──────────────────────────────────────────────────── */

test('meta upserts by key and reads back as a map', async () => {
  const writer = fakeD1();
  upsertMeta(writer.db, 'schema_version', '1');
  assert.match(writer.statements[0].sql, /INSERT INTO meta \(key, value\)/);
  assert.deepEqual(writer.statements[0].bindings, ['schema_version', '1']);

  const reader = fakeD1([{ key: 'updated_at', value: 'STAMP' }]);
  const meta = await readMeta(reader.db);
  assert.equal(meta.get('updated_at'), 'STAMP');
});

test('isTableEmpty recognises a first run', async () => {
  assert.equal(await isTableEmpty(fakeD1([{ count: 0 }]).db, 'items'), true);
  assert.equal(await isTableEmpty(fakeD1([{ count: 3 }]).db, 'items'), false);
});

/* ── http ────────────────────────────────────────────────────────── */

const jsonRequest = (body, headers = {}) => new Request('https://example.test/api/state', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('readJsonBody parses a well-formed request', async () => {
  assert.deepEqual(await readJsonBody(jsonRequest({ n: 1 })), { n: 1 });
});

test('readJsonBody rejects the wrong content type, bad JSON, and oversized bodies', async () => {
  await assert.rejects(
    () => readJsonBody(new Request('https://example.test/x', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })),
    (cause) => cause instanceof RequestError && cause.status === 415,
  );
  await assert.rejects(
    () => readJsonBody(jsonRequest('{ not json')),
    (cause) => cause instanceof RequestError && cause.status === 400,
  );
  await assert.rejects(
    () => readJsonBody(jsonRequest({ padding: 'x'.repeat(5000) }), { maxBytes: 32 }),
    (cause) => cause instanceof RequestError && cause.status === 413,
  );
});

test('the byte cap is enforced while reading, not only from content-length', async () => {
  // A body with no declared content-length must still be cut off mid-stream.
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('x'.repeat(4096)));
      controller.close();
    },
  });
  const request = new Request('https://example.test/x', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half',
  });
  await assert.rejects(
    () => readJsonBody(request, { maxBytes: 64 }),
    (cause) => cause instanceof RequestError && cause.status === 413,
  );
});

test('json responses are never cached and errors carry their status', async () => {
  const response = json({ ok: true });
  assert.equal(response.headers.get('cache-control'), 'no-store');

  const known = errorResponse(new RequestError('Nope.', 409));
  assert.equal(known.status, 409);
  assert.deepEqual(await known.json(), { error: 'Nope.' });

  const lines = [];
  const unknown = errorResponse(new Error('connection reset'), { path: '/api/state', log: (line) => lines.push(line) });
  assert.equal(unknown.status, 500);
  assert.deepEqual(await unknown.json(), { error: 'Internal server error.' });
  assert.match(lines[0], /connection reset/, 'the real cause is logged');
});

/* ── auth ────────────────────────────────────────────────────────── */

function loginRequest(password) {
  const form = new FormData();
  form.set('password', password);
  return new Request('https://example.test/login', { method: 'POST', body: form });
}

const cookieOf = (response) => response.headers.get('set-cookie').split(';')[0];

const requestWithCookie = (cookie, url = 'https://example.test/') =>
  new Request(url, { headers: { cookie } });

test('a wrong password is rejected and sets no cookie', async () => {
  const gate = createPasswordGate({ password: 'correct horse' });
  const response = await gate.handleAuthRoutes(loginRequest('wrong'));

  assert.equal(response.status, 401);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.match(await response.text(), /Incorrect password/);
});

test('the correct password produces a cookie that verifies', async () => {
  const gate = createPasswordGate({ password: 'correct horse' });
  const response = await gate.handleAuthRoutes(loginRequest('correct horse'));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/');
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.match(setCookie, /Max-Age=2592000/);

  assert.equal(await gate.isAuthenticated(requestWithCookie(cookieOf(response))), true);
  assert.equal(await gate.isAuthenticated(new Request('https://example.test/')), false);
});

test('changing the configured password invalidates an existing cookie', async () => {
  const before = createPasswordGate({ password: 'first secret' });
  const cookie = cookieOf(await before.handleAuthRoutes(loginRequest('first secret')));
  assert.equal(await before.isAuthenticated(requestWithCookie(cookie)), true);

  const after = createPasswordGate({ password: 'second secret' });
  assert.equal(await after.isAuthenticated(requestWithCookie(cookie)), false,
    'rotating the secret must end every existing session');
});

test('the cookie salt separates two instruments sharing one password', async () => {
  const one = createPasswordGate({ password: 'shared', cookieSalt: 'one:v1:' });
  const two = createPasswordGate({ password: 'shared', cookieSalt: 'two:v1:' });
  const cookie = cookieOf(await one.handleAuthRoutes(loginRequest('shared')));

  assert.equal(await one.isAuthenticated(requestWithCookie(cookie)), true);
  assert.equal(await two.isAuthenticated(requestWithCookie(cookie)), false);
});

test('logout clears the cookie and non-auth routes fall through', async () => {
  const gate = createPasswordGate({ password: 'secret' });
  const response = await gate.handleAuthRoutes(new Request('https://example.test/logout', { method: 'POST' }));
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);

  assert.equal(await gate.handleAuthRoutes(new Request('https://example.test/api/state')), null);
  assert.equal(await gate.handleAuthRoutes(new Request('https://example.test/login')), null,
    'a GET on the login path is not an auth route');
});

test('the login page is replaceable', async () => {
  const gate = createPasswordGate({
    password: 'secret',
    loginPath: '/enter',
    renderLogin: ({ failed, loginPath }) => `<form action="${loginPath}">${failed ? 'no' : 'hello'}</form>`,
  });
  assert.equal(await gate.loginResponse().text(), '<form action="/enter">hello</form>');
  assert.equal(await gate.loginResponse(true).text(), '<form action="/enter">no</form>');
});
