import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { RemoteStorageBackend } from '../src/engine/remote-storage.ts';
import { LocalStorageBackend } from '../src/engine/state-backend.ts';
import { createStorage, memoryDriver } from '../src/engine/storage.ts';

const DEBOUNCE = 20;
const RETRY = 10;

/** Records every call and answers with whatever the queue says. */
function recordingFetch(responder = () => ok({})) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const call = { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : null };
    calls.push(call);
    return responder(call, calls.length);
  };
  return { fetch, calls };
}

const ok = (payload) => new Response(JSON.stringify(payload), {
  status: 200, headers: { 'content-type': 'application/json' },
});

const backend = (options) => new RemoteStorageBackend({
  stateUrl: '/api/state',
  onError: () => {},
  debounceMs: DEBOUNCE,
  retryDelayMs: RETRY,
  ...options,
});

test('rapid saves coalesce into one POST carrying the last snapshot', async () => {
  const { fetch, calls } = recordingFetch();
  const remote = backend({ fetch });

  await remote.save({ n: 1 });
  await remote.save({ n: 2 });
  await remote.save({ n: 3 });
  await sleep(DEBOUNCE * 4);

  const posts = calls.filter((call) => call.method === 'POST');
  assert.equal(posts.length, 1, 'three rapid saves must produce one request');
  assert.deepEqual(posts[0].body, { n: 3 });
});

test('a save during an in-flight POST is re-armed, not dropped', async () => {
  let releaseFirst;
  const firstInFlight = new Promise((resolve) => { releaseFirst = resolve; });
  const { fetch, calls } = recordingFetch(async (call, index) => {
    if (call.method === 'POST' && index === 1) { await firstInFlight; }
    return ok({});
  });
  const remote = backend({ fetch });

  await remote.save({ n: 1 });
  await sleep(DEBOUNCE * 2);
  assert.equal(calls.length, 1, 'the first POST should be in flight');

  await remote.save({ n: 2 });
  await sleep(DEBOUNCE * 2);
  releaseFirst();
  await sleep(DEBOUNCE * 4);

  const posts = calls.filter((call) => call.method === 'POST');
  assert.equal(posts.length, 2, 'work arriving mid-flight must still be written');
  assert.deepEqual(posts[1].body, { n: 2 });
});

test('load() cancels a queued save so stale state is never posted', async () => {
  const { fetch, calls } = recordingFetch(() => ok({ n: 'from server' }));
  const remote = backend({ fetch });

  await remote.save({ n: 'stale' });
  const loaded = await remote.load();
  await sleep(DEBOUNCE * 4);

  assert.deepEqual(calls.filter((call) => call.method === 'POST'), []);
  assert.deepEqual(loaded, { n: 'from server' });
});

test('a save retries once before reporting an error', async () => {
  const errors = [];
  let attempts = 0;
  const fetch = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('network down');
    return ok({});
  };
  const remote = backend({ fetch, onError: (message) => errors.push(message) });

  await remote.save({ n: 1 });
  await sleep(DEBOUNCE * 2 + RETRY * 4);

  assert.equal(attempts, 2, 'the first failure should be retried');
  assert.deepEqual(errors, [], 'a recovered save must not surface an error');
});

test('a save that fails twice reports the server message through onError', async () => {
  const errors = [];
  const fetch = async () => new Response(JSON.stringify({ error: 'Disk is full.' }), {
    status: 500, headers: { 'content-type': 'application/json' },
  });
  const remote = backend({ fetch, onError: (message) => errors.push(message) });

  await remote.save({ n: 1 });
  await sleep(DEBOUNCE * 2 + RETRY * 6);

  assert.deepEqual(errors, ['Disk is full.'], 'the server error field beats the fallback');
});

test('isEmpty and hasLocalMigration follow meta.empty and local state', async () => {
  const { fetch } = recordingFetch(() => ok({ meta: { empty: true } }));
  const remote = backend({ fetch, readLocalState: () => '{"n":1}' });

  assert.equal(remote.isEmpty, false, 'nothing is known before the first load');
  await remote.load();
  assert.equal(remote.isEmpty, true);
  assert.equal(remote.hasLocalMigration, true);

  const withoutLocal = backend({ fetch });
  await withoutLocal.load();
  assert.equal(withoutLocal.hasLocalMigration, false);
});

test('migrateFromLocal posts local state to the migrate endpoint, then reloads', async () => {
  const { fetch, calls } = recordingFetch((call) =>
    call.method === 'POST' ? ok({ ok: true }) : ok({ n: 'server', meta: { empty: false } }));
  const remote = backend({ fetch, migrateUrl: '/api/migrate', readLocalState: () => '{"n":"local"}' });

  const result = await remote.migrateFromLocal();

  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [
    'POST /api/migrate',
    'GET /api/state',
  ]);
  assert.deepEqual(calls[0].body, { n: 'local' });
  assert.deepEqual(result, { n: 'server', meta: { empty: false } });
});

test('migrateFromLocal refuses without an endpoint or without local state', async () => {
  const { fetch } = recordingFetch();
  await assert.rejects(
    () => backend({ fetch, readLocalState: () => '{}' }).migrateFromLocal(),
    /migration endpoint/i,
  );
  await assert.rejects(
    () => backend({ fetch, migrateUrl: '/api/migrate' }).migrateFromLocal(),
    /No local state/i,
  );
});

test('normalize converts the payload on load', async () => {
  const { fetch } = recordingFetch(() => ok({ value: 2 }));
  const remote = backend({ fetch, normalize: (payload) => ({ value: payload.value * 10 }) });
  assert.deepEqual(await remote.load(), { value: 20 });
});

test('LocalStorageBackend round-trips state through createStorage', async () => {
  const storage = createStorage({ driver: memoryDriver(), namespace: 'app_' });
  const local = new LocalStorageBackend({ storage, fallback: () => ({ items: [] }) });

  assert.equal(local.kind, 'local');
  assert.equal(local.key, 'app_state');
  assert.deepEqual(await local.load(), { items: [] }, 'an empty store yields the fallback');

  await local.save({ items: ['one'] });
  assert.deepEqual(await local.load(), { items: ['one'] });
  assert.deepEqual(JSON.parse(storage.driver.getItem('app_state')), { items: ['one'] });
});

test('LocalStorageBackend raises a failed write instead of swallowing it', async () => {
  const driver = memoryDriver();
  driver.setItem = () => { throw new Error('quota exceeded'); };
  const local = new LocalStorageBackend({ storage: createStorage({ driver }), fallback: () => ({}) });

  await assert.rejects(() => local.save({ items: [] }), /Could not write state/);
});
