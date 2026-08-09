import assert from 'node:assert/strict';
import test from 'node:test';

import { esc, fmt } from '../src/canon/format.ts';
import { createStorage, memoryDriver } from '../src/engine/storage.ts';
import { getJournal, appendEntry, supersede } from '../src/engine/journal.ts';
import { notify, subscribe } from '../src/engine/store.ts';
import { deserialize, navigate, onRouteChange, serialize } from '../src/engine/router.ts';
import { cameraViewBox, fitCameraToBox } from '../src/geometry/camera.ts';

test('migrations run in order', () => {
  const storage = createStorage({ driver: memoryDriver(), namespace: 'test_' });
  const order = [];
  const migrations = [
    { name: 'first', run: () => order.push(1) },
    { name: 'second', run: () => order.push(2) },
  ];

  const report = storage.migrate(migrations);
  assert.deepEqual(report.applied, ['first', 'second']);
  assert.equal(report.failed, null);
  assert.deepEqual(order, [1, 2]);
  assert.equal(storage.read(storage.key('schema_version'), -1), 2);
});

test('each migration is checkpointed, so a failure stops the run at a known version', () => {
  const driver = memoryDriver();
  const storage = createStorage({ driver, namespace: 'test_' });
  const runs = [];
  const migrations = (broken) => [
    { name: 'first', run: () => runs.push('first') },
    { name: 'second', run: () => { runs.push('second'); if (broken) throw new Error('stop'); } },
    { name: 'third', run: () => runs.push('third') },
  ];

  const failed = storage.migrate(migrations(true));

  assert.deepEqual(failed.applied, ['first']);
  assert.equal(failed.from, 0);
  assert.equal(failed.to, 1);
  assert.equal(failed.failed?.name, 'second');
  assert.equal(failed.failed?.index, 1);
  assert.equal(failed.failed?.error.message, 'stop');
  assert.equal(storage.read(storage.key('schema_version'), -1), 1);
  assert.deepEqual(runs, ['first', 'second']);

  const retry = storage.migrate(migrations(false));

  assert.equal(retry.from, 1);
  assert.equal(retry.to, 3);
  assert.deepEqual(retry.applied, ['second', 'third']);
  assert.equal(retry.failed, null);
  assert.deepEqual(runs, ['first', 'second', 'second', 'third'], 'first must not run twice');
  assert.equal(storage.read(storage.key('schema_version'), -1), 3);
});

test('a migration that fails first leaves the version where it started', () => {
  const storage = createStorage({ driver: memoryDriver(), namespace: 'test_' });
  const report = storage.migrate([
    { name: 'first', run: () => { throw new Error('stop'); } },
    { name: 'second', run: () => undefined },
  ]);

  assert.deepEqual(report.applied, []);
  assert.equal(report.to, 0);
  assert.equal(report.failed?.name, 'first');
  assert.equal(storage.driver.getItem(storage.key('schema_version')), null);
});

test('storage instances are independent — no process-wide driver', () => {
  const one = createStorage({ driver: memoryDriver(), namespace: 'one_' });
  const two = createStorage({ driver: memoryDriver(), namespace: 'two_' });

  one.write(one.key('value'), 'from one');
  two.write(two.key('value'), 'from two');

  assert.equal(one.read(one.key('value'), null), 'from one');
  assert.equal(two.read(two.key('value'), null), 'from two');
  assert.equal(one.driver.getItem(two.key('value')), null);
  assert.equal(two.driver.length, 1);
});

test('keysWithPrefix snapshots keys so every match can be deleted during iteration', () => {
  const driver = memoryDriver({
    item_1: 'one',
    item_2: 'two',
    item_3: 'three',
    other: 'keep',
  });
  const storage = createStorage({ driver });

  for (const storageKey of storage.keysWithPrefix('item_')) storage.remove(storageKey);

  assert.deepEqual(storage.keysWithPrefix('item_'), []);
  assert.equal(driver.getItem('other'), 'keep');
  assert.equal(driver.length, 1);
});

test('superseding appends and leaves the original journal entry unchanged', () => {
  const storage = createStorage({ driver: memoryDriver() });
  const storageKey = 'journal';
  const first = appendEntry(storage, storageKey, {
    subjectId: 'subject-1',
    decision: 'Keep the first decision',
    rationale: 'It is supported',
    alternatives_rejected: 'Replace it',
    decided_at: '2026-08-08T10:00:00.000Z',
  }, () => '', 'fallback');
  const snapshot = structuredClone(first);

  const second = supersede(storage, storageKey, first.id, {
    subjectId: 'subject-1',
    decision: 'Use the later decision',
    rationale: 'New evidence',
    alternatives_rejected: 'Keep it',
    decided_at: '2026-08-08T11:00:00.000Z',
  }, () => 'author', 'fallback');

  const journal = getJournal(storage, storageKey);
  assert.equal(journal.length, 2);
  assert.deepEqual(journal[0], snapshot);
  assert.equal(journal[1]?.supersedes, first?.id);
  assert.equal(second?.supersedes, first?.id);
});

test('unsubscribe removes a store listener', () => {
  let calls = 0;
  const unsubscribe = subscribe(() => { calls += 1; });
  notify();
  unsubscribe();
  notify();
  assert.equal(calls, 1);
});

test('router navigate notifies with a round-tripped path and params', () => {
  const eventListeners = new Map();
  const location = { pathname: '/app', search: '', hash: '' };
  globalThis.window = {
    location,
    history: {
      pushState(_state, _title, url) { location.hash = String(url).split('#')[1] ? `#${String(url).split('#')[1]}` : ''; },
      replaceState(_state, _title, url) { this.pushState(_state, _title, url); },
    },
    addEventListener(type, fn) { eventListeners.set(type, fn); },
  };

  let received;
  const unsubscribe = onRouteChange((route) => { received = route; });
  navigate('/map/node', { focus: 'a b', panel: 'details' });

  assert.deepEqual(received, {
    path: ['map', 'node'],
    params: { focus: 'a b', panel: 'details' },
  });
  assert.deepEqual(deserialize(serialize(received)), received);
  unsubscribe();
  delete globalThis.window;
});

test('format and camera primitives smoke test', () => {
  assert.equal(esc('<button>'), '&lt;button&gt;');
  assert.equal(fmt(1234, 'en-US'), '1,234');
  const camera = fitCameraToBox(
    { minX: 0, minY: 0, maxX: 100, maxY: 50 },
    { width: 200, height: 100 },
    1,
  );
  assert.equal(cameraViewBox(camera, { width: 200, height: 100 }), '0 0 100 50');
});
