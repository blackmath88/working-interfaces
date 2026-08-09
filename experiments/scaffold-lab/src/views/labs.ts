import {
  appendEntry,
  createStorage,
  deserialize,
  getJournal,
  memoryDriver,
  notify,
  now,
  subscribe,
  supersede,
} from '@working-interfaces/scaffold';
import type { JournalEntry, KeyValueDriver, KeyValueStorage, Migration, ViewState } from '@working-interfaces/scaffold';
import { esc } from '@working-interfaces/scaffold';
import { CHECKS } from '../domain/content.ts';
import type { LabViewState, LogEntry, Snapshot } from '../domain/types.ts';

export interface LabRuntime {
  readonly view: ViewState<LabViewState>;
  got(): Readonly<Record<string, boolean>>;
  hasGot(id: string): boolean;
  setGot(id: string, value: boolean): void;
  progress(): { done: number; total: number };
  snapshot(): Snapshot;
  journal(): readonly JournalEntry[];
  runDemo(action: string): void;
  paint(lessonId: string): void;
  setCanonName(value: string): void;
  resetEphemeralForNavigation(): void;
}

const STORE_VALUE_NAME = 'store_demo_value';

const driverContents = (driver: KeyValueDriver): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (let index = 0; index < driver.length; index += 1) {
    const storageKey = driver.key(index);
    if (!storageKey) continue;
    const raw = driver.getItem(storageKey);
    try { result[storageKey] = raw === null ? null : JSON.parse(raw); }
    catch { result[storageKey] = raw; }
  }
  return result;
};

export function createLabRuntime(view: ViewState<LabViewState>, appStorage: KeyValueStorage): LabRuntime {
  const journalKey = appStorage.key('journal');
  let understood: Record<string, boolean> = {};
  let domainName = '';
  let deriveLines = ['export function score(list) {', '  return list.length * 3', '}'];
  let demoSubscribers: Array<() => void> = [];
  let notifyCalls = 0;
  let cachedSubscriberValue = 0;
  let storeStorage = seededStoreStorage();
  let migrationStorage = seededMigrationStorage();
  let migrationBefore: Record<string, unknown> | null = null;
  let migrationAfter: Record<string, unknown> | null = null;
  let migrationOutcome = 'Run a migration to inspect the real driver.';
  let retryAfterFailure = false;
  let judgmentMode: 'local' | 'store' = 'local';
  let panelA = 0;
  let panelB = 0;
  let sharedValue = 0;

  function log(message: string, kind?: LogEntry['kind']): void {
    const current = view.get().log;
    view.set({ log: [...current, { n: current.length + 1, message, kind }].slice(-40) });
  }

  function clearLog(): void {
    view.set({ log: [] });
  }

  function addJournal(subjectId: string, decision: string, rationale: string): JournalEntry | null {
    const entry = appendEntry(appStorage, journalKey, {
      subjectId,
      scope: 'scaffold-lab',
      decision,
      rationale,
      alternatives_rejected: 'Leave the previous state unchanged',
    }, () => null, 'lab');
    notify();
    return entry;
  }

  function journal(): readonly JournalEntry[] {
    return getJournal(appStorage, journalKey);
  }

  function liveEntries(): readonly JournalEntry[] {
    const entries = journal();
    const superseded = new Set(entries.map((entry) => entry.supersedes).filter(Boolean));
    return entries.filter((entry) => !superseded.has(entry.id));
  }

  /** A run that follows a failure resumes; anything else starts from a fresh seed. */
  function runMigrations(broken: boolean): void {
    const resuming = retryAfterFailure;
    if (!resuming) migrationStorage = seededMigrationStorage();
    migrationBefore = driverContents(migrationStorage.driver);

    const report = migrationStorage.migrate(migrationsFor(migrationStorage, broken), 3);
    retryAfterFailure = report.failed !== null;

    if (resuming) log(`resumed at version ${report.from} — earlier migrations do not run again`, 'fire');
    report.applied.forEach((name, offset) => log(`${name} — applied, version checkpointed to ${report.from + offset + 1}`, 'ok'));
    if (report.failed) {
      log(`${report.failed.name} — threw: ${report.failed.error.message}`, 'fail');
      log(`run stopped; stored version read back from driver: ${String(readVersion(migrationStorage))}`, 'fail');
      log('Run migrations 1 → 3 to retry. It resumes at the step that failed.', 'fire');
      migrationOutcome = `migrate() reported ${report.from} → ${report.to}; applied ${report.applied.join(', ') || 'nothing'}; stopped at ${report.failed.name}. ${report.notes.join(' ')}`;
    } else {
      log(`stored version: ${String(readVersion(migrationStorage))}`, 'ok');
      migrationOutcome = `migrate() reported ${report.from} → ${report.to}; applied ${report.applied.join(', ') || 'nothing'}. ${report.notes.join(' ')}`;
    }
    migrationAfter = driverContents(migrationStorage.driver);
  }

  function runDemo(action: string): void {
    switch (action) {
      case 'clear':
        clearLog();
        deriveLines = ['export function score(list) {', '  return list.length * 3', '}'];
        if (view.get().lesson === 'storage') {
          migrationStorage = seededMigrationStorage();
          migrationBefore = null;
          migrationAfter = null;
          migrationOutcome = 'Run a migration to inspect the real driver.';
          retryAfterFailure = false;
        }
        if (view.get().lesson === 'store') {
          demoSubscribers.forEach((stop) => stop());
          demoSubscribers = [];
          notifyCalls = 0;
          cachedSubscriberValue = 0;
          storeStorage = seededStoreStorage();
        }
        break;
      case 'mig-ok': runMigrations(false); break;
      case 'mig-fail': runMigrations(true); break;
      case 'sub': {
        const subscriberNumber = demoSubscribers.length + 1;
        const stop = subscribe(() => {
          cachedSubscriberValue = storeStorage.read<number>(storeStorage.key(STORE_VALUE_NAME), 0);
          log(`subscriber ${subscriberNumber} redrew with ${cachedSubscriberValue}`, 'fire');
        });
        demoSubscribers.push(stop);
        log('real scaffold subscriber attached', 'ok');
        break;
      }
      case 'write': {
        const valueKey = storeStorage.key(STORE_VALUE_NAME);
        const next = storeStorage.read<number>(valueKey, 0) + 1;
        storeStorage.write(valueKey, next);
        notifyCalls += 1;
        log(`store write committed ${next}; notify() follows`, 'ok');
        notify();
        break;
      }
      case 'sneak': {
        const valueKey = storeStorage.key(STORE_VALUE_NAME);
        const driverValue = JSON.parse(storeStorage.driver.getItem(valueKey) ?? '0') as number;
        storeStorage.driver.setItem(valueKey, JSON.stringify(driverValue + 1));
        log('driver changed directly; notify() did not run', 'fail');
        log(`subscriber still shows ${cachedSubscriberValue}, driver contains ${driverValue + 1}`, 'fail');
        break;
      }
      case 'j-add': {
        const input = document.querySelector<HTMLInputElement>('#dec');
        const decision = input?.value.trim() ?? '';
        if (!decision) { log('type a decision first', 'fail'); break; }
        addJournal('demo', decision, 'recorded in the lab');
        if (input) input.value = '';
        break;
      }
      case 'j-supersede': {
        const latest = liveEntries().at(-1);
        if (!latest) { log('record something first', 'fail'); break; }
        supersede(appStorage, journalKey, latest.id, {
          subjectId: latest.subjectId,
          scope: 'scaffold-lab',
          decision: `${latest.decision} — revised`,
          rationale: 'changed my mind',
          alternatives_rejected: latest.decision,
        }, () => null, 'lab');
        notify();
        break;
      }
      case 'j-delete': log('there is no delete function. that is the design.', 'fail'); break;
      case 'pure': deriveLines.splice(2, 0, '  const doubled = list.length * 2'); log('purity check passed', 'ok'); break;
      case 'clock': deriveLines.splice(2, 0, '  const now = Date.now()'); log('purity check FAILED — derive.ts:3 reads the clock', 'fail'); log('build stopped', 'fail'); break;
      case 'rand': deriveLines.splice(2, 0, '  const pick = Math.random()'); log('purity check FAILED — derive.ts:3 uses randomness', 'fail'); log('same input would give a different answer', 'fail'); break;
      case 'ls': deriveLines.splice(2, 0, "  const raw = localStorage.getItem('x')"); log('purity check FAILED — derive.ts:3 touches storage', 'fail'); log('derive may only read its arguments', 'fail'); break;
      case 'vs-dom': domainName = `Stakeholder ${journal().length + 1}`; notify(); break;
      case 'vs-view': view.set({ panelOpen: !view.get().panelOpen }); break;
      case 'r-focus': window.dispatchEvent(new CustomEvent('lab:navigate', { detail: { path: ['router'], params: { focus: 's-14' } } })); return;
      case 'r-clear': window.dispatchEvent(new CustomEvent('lab:navigate', { detail: { path: ['router'], params: {} } })); return;
      case 'r-jump': window.dispatchEvent(new CustomEvent('lab:navigate', { detail: { path: ['journal'], params: {} } })); return;
      case 'copy': void navigator.clipboard?.writeText(JSON.stringify(snapshot(), null, 2)); break;
      case 'download': downloadSnapshot(snapshot()); break;
      case 'judgment-local': judgmentMode = 'local'; panelA = sharedValue; panelB = sharedValue; break;
      case 'judgment-store': judgmentMode = 'store'; sharedValue = panelA; notify(); break;
      case 'judgment-left':
        if (judgmentMode === 'local') panelA += 1;
        else { sharedValue += 1; notify(); }
        break;
    }
    paint(view.get().lesson);
  }

  function paint(lessonId: string): void {
    const out = document.querySelector<HTMLElement>('#demo-out');
    if (out) out.innerHTML = logView(view.get().log);

    if (lessonId === 'storage') paintMigrations(migrationBefore, migrationAfter, migrationOutcome);
    if (lessonId === 'store') {
      setText('#p-listeners', String(demoSubscribers.length));
      setText('#p-fires', String(notifyCalls));
      setText('#p-cache', String(cachedSubscriberValue));
      setText('#p-driver', storeStorage.driver.getItem(storeStorage.key(STORE_VALUE_NAME)) ?? '0');
    }
    if (lessonId === 'journal') paintJournal(journal());
    if (lessonId === 'derive') setText('#derive-src', deriveLines.join('\n'));
    if (lessonId === 'viewstate') {
      setText('#p-dom', domainName || '—');
      setText('#p-view', view.get().panelOpen ? 'open' : 'closed');
    }
    if (lessonId === 'router') {
      const route = deserialize(window.location.hash);
      setText('#p-path', `/${route.path.join('/')}`);
      setText('#p-params', Object.keys(route.params).length ? JSON.stringify(route.params) : '—');
    }
    if (lessonId === 'canon') paintCanon(view.get().demoName);
    if (lessonId === 'when-you-need-a-store') {
      setText('#judgment-a', String(judgmentMode === 'store' ? sharedValue : panelA));
      setText('#judgment-b', String(judgmentMode === 'store' ? sharedValue : panelB));
      setText('#judgment-mode', judgmentMode === 'store' ? 'Store mode: both panels read one owner.' : 'Local variable mode: changing panel A leaves panel B stale.');
    }
  }

  function progress(): { done: number; total: number } {
    const teachable = new Set(CHECKS.map((check) => check.lessonId));
    return { done: [...teachable].filter((id) => understood[id]).length, total: teachable.size };
  }

  function snapshot(): Snapshot {
    const status = progress();
    return {
      instrument: 'scaffold-lab',
      exported: now(),
      progress: { understood: status.done, of: status.total },
      modules: Object.keys(understood),
      journal: journal().map(({ id, decision, supersedes }) => ({ id, decision, supersedes: supersedes ?? null })),
    };
  }

  return {
    view,
    got: () => ({ ...understood }),
    hasGot: (id) => Boolean(understood[id]),
    setGot(id, value) {
      if (value) understood = { ...understood, [id]: true };
      else { const { [id]: _removed, ...remaining } = understood; understood = remaining; }
      addJournal(id, value ? 'Marked understood' : 'Unmarked', 'scaffold lab');
    },
    progress,
    snapshot,
    journal,
    runDemo,
    paint,
    setCanonName(value) { view.set({ demoName: value }); paintCanon(value); },
    resetEphemeralForNavigation() { view.set({ log: [], demoName: '', panelOpen: false }); },
  };
}

function seededStoreStorage(): KeyValueStorage {
  const storage = createStorage({ driver: memoryDriver() });
  storage.write(storage.key(STORE_VALUE_NAME), 0);
  return storage;
}

function seededMigrationStorage(): KeyValueStorage {
  const storage = createStorage({ driver: memoryDriver() });
  storage.write(storage.key('schema_version'), 0);
  storage.write(storage.key('profile'), { name: 'Ada Lovelace' });
  return storage;
}

/** Plain numbered steps. Checkpointing means none of them ever runs twice. */
function migrationsFor(storage: KeyValueStorage, broken: boolean): readonly Migration[] {
  const profileKey = storage.key('profile');
  const idsKey = storage.key('profile_ids');
  return [
    { name: '1 add-influence', run(notes) {
      const profile = storage.read<Record<string, unknown>>(profileKey, {});
      storage.write(profileKey, { ...profile, influence: 'high' });
      notes.push('Step 1 added influence.');
    } },
    { name: '2 split-name', run(notes) {
      if (broken) throw new Error('Migration 2 intentionally threw.');
      const profile = storage.read<Record<string, unknown>>(profileKey, {});
      const [firstName = '', ...rest] = String(profile.name ?? '').split(' ');
      const { name: _name, ...remaining } = profile;
      storage.write(profileKey, { ...remaining, firstName, lastName: rest.join(' ') });
      notes.push('Step 2 split the name.');
    } },
    { name: '3 index-ids', run(notes) {
      storage.write(idsKey, ['profile-1']);
      notes.push('Step 3 indexed ids.');
    } },
  ];
}

function readVersion(storage: KeyValueStorage): unknown {
  return storage.read<unknown>(storage.key('schema_version'), null);
}

function logView(entries: readonly LogEntry[]): string {
  if (!entries.length) return '<div class="log"><div class="empty">Nothing yet — press a button above.</div></div>';
  return `<div class="log">${entries.map((entry) => `<div class="log-e" data-k="${esc(entry.kind ?? '')}"><span class="n">${entry.n}</span><span class="m">${esc(entry.message)}</span></div>`).join('')}</div>`;
}

function paintMigrations(before: Record<string, unknown> | null, after: Record<string, unknown> | null, outcome: string): void {
  const element = document.querySelector<HTMLElement>('#migration-state');
  if (!element) return;
  element.innerHTML = `<div class="split"><div class="pane"><div class="pane-h">driver before</div><pre>${esc(before ? JSON.stringify(before, null, 2) : '—')}</pre></div><div class="pane"><div class="pane-h">driver after</div><pre>${esc(after ? JSON.stringify(after, null, 2) : '—')}</pre></div></div><p class="mono migration-outcome">${esc(outcome)}</p>`;
}

function paintJournal(entries: readonly JournalEntry[]): void {
  const box = document.querySelector<HTMLElement>('#j-list');
  if (!box) return;
  if (!entries.length) { box.innerHTML = '<div class="empty entry-empty">No decisions recorded yet.</div>'; return; }
  const superseded = new Set(entries.map((entry) => entry.supersedes).filter(Boolean));
  box.innerHTML = entries.map((entry) => {
    const dead = superseded.has(entry.id);
    return `<div class="entry" ${dead ? 'data-dead' : ''}><div class="entry-h"><span class="entry-id">${esc(entry.id)}</span><span class="entry-d">${esc(entry.decision)}</span><span class="tag" data-t="${dead ? 'dead' : 'live'}">${dead ? 'superseded' : 'current'}</span></div><div class="entry-m">${esc(entry.rationale)}${entry.supersedes ? ` · replaces <code>${esc(entry.supersedes)}</code>` : ''}</div></div>`;
  }).join('');
}

function paintCanon(raw: string): void {
  setText('#p-safe', raw ? esc(raw) : '—');
  const unsafe = document.querySelector<HTMLElement>('#p-raw');
  if (unsafe) unsafe.innerHTML = raw ? raw.replace(/on\w+\s*=/gi, 'data-blocked-event=') : '—';
}

function setText(selector: string, value: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}

function downloadSnapshot(snapshot: Snapshot): void {
  const anchor = document.createElement('a');
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
  anchor.href = url;
  anchor.download = 'scaffold-lab.json';
  anchor.click();
  URL.revokeObjectURL(url);
}
