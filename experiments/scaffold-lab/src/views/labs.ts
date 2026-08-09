import {
  appendEntry,
  deserialize,
  getDriver,
  getJournal,
  key,
  memoryDriver,
  migrate,
  notify,
  now,
  read,
  setDriver,
  subscribe,
  supersede,
  write,
} from '@working-interfaces/scaffold';
import type { JournalEntry, KeyValueDriver, Migration, ViewState } from '@working-interfaces/scaffold';
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

const APP_JOURNAL_KEY = key('journal');
const STORE_VALUE_KEY = key('store_demo_value');

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

const withDriver = <T>(driver: KeyValueDriver, operation: () => T): T => {
  const previous = getDriver();
  setDriver(driver);
  try { return operation(); }
  finally { setDriver(previous); }
};

export function createLabRuntime(view: ViewState<LabViewState>, appDriver: KeyValueDriver): LabRuntime {
  let understood: Record<string, boolean> = {};
  let domainName = '';
  let deriveLines = ['export function score(list) {', '  return list.length * 3', '}'];
  let demoSubscribers: Array<() => void> = [];
  let notifyCalls = 0;
  let cachedSubscriberValue = 0;
  let storeDriver = memoryDriver({ [STORE_VALUE_KEY]: JSON.stringify(0) });
  let migrationDriver = seededMigrationDriver();
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
    const entry = withDriver(appDriver, () => appendEntry(APP_JOURNAL_KEY, {
      subjectId,
      scope: 'scaffold-lab',
      decision,
      rationale,
      alternatives_rejected: 'Leave the previous state unchanged',
    }, () => null, 'lab'));
    notify();
    return entry;
  }

  function journal(): readonly JournalEntry[] {
    return withDriver(appDriver, () => getJournal(APP_JOURNAL_KEY));
  }

  function liveEntries(): readonly JournalEntry[] {
    const entries = journal();
    const superseded = new Set(entries.map((entry) => entry.supersedes).filter(Boolean));
    return entries.filter((entry) => !superseded.has(entry.id));
  }

  function runMigrations(broken: boolean): void {
    if (broken || !retryAfterFailure) migrationDriver = seededMigrationDriver();
    migrationBefore = driverContents(migrationDriver);
    const migrations = migrationsFor(migrationDriver, broken);
    try {
      const report = withDriver(migrationDriver, () => migrate(migrations, 3));
      migrationOutcome = `migrate() reported ${report.from} → ${report.to}; ${report.applied.join(', ')}. ${report.notes.join(' ')}`;
      retryAfterFailure = false;
      log(`stored version: ${String(readDriverVersion(migrationDriver))}`, 'ok');
      report.applied.forEach((name) => log(`${name} — ok`, 'ok'));
    } catch (error) {
      migrationOutcome = error instanceof Error ? error.message : String(error);
      retryAfterFailure = true;
      log('migration 2 split-name — threw', 'fail');
      log(`stored version read back from driver: ${String(readDriverVersion(migrationDriver))}`, 'fail');
      log('The next working run re-enters at version 0; idempotent step 1 observes its prior work before step 2 retries.', 'fire');
    }
    migrationAfter = driverContents(migrationDriver);
  }

  function runDemo(action: string): void {
    switch (action) {
      case 'clear':
        clearLog();
        deriveLines = ['export function score(list) {', '  return list.length * 3', '}'];
        if (view.get().lesson === 'storage') {
          migrationDriver = seededMigrationDriver();
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
          storeDriver = memoryDriver({ [STORE_VALUE_KEY]: JSON.stringify(0) });
        }
        break;
      case 'mig-ok': runMigrations(false); break;
      case 'mig-fail': runMigrations(true); break;
      case 'sub': {
        const subscriberNumber = demoSubscribers.length + 1;
        const stop = subscribe(() => {
          cachedSubscriberValue = withDriver(storeDriver, () => read<number>(STORE_VALUE_KEY, 0));
          log(`subscriber ${subscriberNumber} redrew with ${cachedSubscriberValue}`, 'fire');
        });
        demoSubscribers.push(stop);
        log('real scaffold subscriber attached', 'ok');
        break;
      }
      case 'write': {
        const next = withDriver(storeDriver, () => read<number>(STORE_VALUE_KEY, 0) + 1);
        withDriver(storeDriver, () => write(STORE_VALUE_KEY, next));
        notifyCalls += 1;
        log(`store write committed ${next}; notify() follows`, 'ok');
        notify();
        break;
      }
      case 'sneak': {
        const driverValue = JSON.parse(storeDriver.getItem(STORE_VALUE_KEY) ?? '0') as number;
        storeDriver.setItem(STORE_VALUE_KEY, JSON.stringify(driverValue + 1));
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
        withDriver(appDriver, () => supersede(APP_JOURNAL_KEY, latest.id, {
          subjectId: latest.subjectId,
          scope: 'scaffold-lab',
          decision: `${latest.decision} — revised`,
          rationale: 'changed my mind',
          alternatives_rejected: latest.decision,
        }, () => null, 'lab'));
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
      setText('#p-driver', storeDriver.getItem(STORE_VALUE_KEY) ?? '0');
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

function seededMigrationDriver(): KeyValueDriver {
  return memoryDriver({
    [key('schema_version')]: JSON.stringify(0),
    [key('profile')]: JSON.stringify({ name: 'Ada Lovelace' }),
  });
}

function migrationsFor(driver: KeyValueDriver, broken: boolean): readonly Migration[] {
  const profileKey = key('profile');
  const idsKey = key('profile_ids');
  return [
    { name: '1 add-influence', run(notes) {
      const profile = JSON.parse(driver.getItem(profileKey) ?? '{}') as Record<string, unknown>;
      if ('influence' in profile) { notes.push('Step 1 was already present and no-oped.'); return; }
      driver.setItem(profileKey, JSON.stringify({ ...profile, influence: 'high' }));
      notes.push('Step 1 added influence.');
    } },
    { name: '2 split-name', run(notes) {
      if (broken) throw new Error('Migration 2 intentionally threw.');
      const profile = JSON.parse(driver.getItem(profileKey) ?? '{}') as Record<string, unknown>;
      if ('firstName' in profile) { notes.push('Step 2 was already present and no-oped.'); return; }
      const [firstName = '', ...rest] = String(profile.name ?? '').split(' ');
      const { name: _name, ...remaining } = profile;
      driver.setItem(profileKey, JSON.stringify({ ...remaining, firstName, lastName: rest.join(' ') }));
      notes.push('Step 2 split the name.');
    } },
    { name: '3 index-ids', run(notes) {
      if (!driver.getItem(idsKey)) driver.setItem(idsKey, JSON.stringify(['profile-1']));
      notes.push('Step 3 indexed ids.');
    } },
  ];
}

function readDriverVersion(driver: KeyValueDriver): unknown {
  const raw = driver.getItem(key('schema_version'));
  return raw === null ? null : JSON.parse(raw);
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
