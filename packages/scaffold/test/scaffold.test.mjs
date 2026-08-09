import assert from 'node:assert/strict';
import test from 'node:test';

import { esc, fmt } from '../src/canon/format.ts';
import {
  configureNamespace,
  key,
  keysWithPrefix,
  memoryDriver,
  migrate,
  read,
  remove,
  setDriver,
} from '../src/engine/storage.ts';
import { getJournal, appendEntry, supersede } from '../src/engine/journal.ts';
import { notify, subscribe } from '../src/engine/store.ts';
import { deserialize, navigate, onRouteChange, serialize } from '../src/engine/router.ts';
import { cameraViewBox, fitCameraToBox } from '../src/geometry/camera.ts';

test('migrations run in order', () => {
  const driver = memoryDriver();
  setDriver(driver);
  configureNamespace('test_');
  const order = [];
  const migrations = [
    { name: 'first', run: () => order.push(1) },
    { name: 'second', run: () => order.push(2) },
  ];

  assert.deepEqual(migrate(migrations).applied, ['first', 'second']);
  assert.deepEqual(order, [1, 2]);
  assert.equal(read(key('schema_version'), -1), 2);
});

test('a failed migration leaves the schema version untouched', () => {
  const failingDriver = memoryDriver();
  setDriver(failingDriver);
  configureNamespace('test_');
  assert.throws(() => migrate([
    { name: 'first', run: () => undefined },
    { name: 'second', run: () => { throw new Error('stop'); } },
  ]), /stop/);
  assert.equal(failingDriver.getItem(key('schema_version')), null);
});

test('keysWithPrefix snapshots keys so every match can be deleted during iteration', () => {
  const driver = memoryDriver({
    item_1: 'one',
    item_2: 'two',
    item_3: 'three',
    other: 'keep',
  });
  setDriver(driver);

  for (const storageKey of keysWithPrefix('item_')) remove(storageKey);

  assert.deepEqual(keysWithPrefix('item_'), []);
  assert.equal(driver.getItem('other'), 'keep');
  assert.equal(driver.length, 1);
});

test('superseding appends and leaves the original journal entry unchanged', () => {
  setDriver(memoryDriver());
  const storageKey = 'journal';
  const first = appendEntry(storageKey, {
    subjectId: 'subject-1',
    decision: 'Keep the first decision',
    rationale: 'It is supported',
    alternatives_rejected: 'Replace it',
    decided_at: '2026-08-08T10:00:00.000Z',
  }, () => '', 'fallback');
  const snapshot = structuredClone(first);

  const second = supersede(storageKey, first.id, {
    subjectId: 'subject-1',
    decision: 'Use the later decision',
    rationale: 'New evidence',
    alternatives_rejected: 'Keep it',
    decided_at: '2026-08-08T11:00:00.000Z',
  }, () => 'author', 'fallback');

  const journal = getJournal(storageKey);
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
