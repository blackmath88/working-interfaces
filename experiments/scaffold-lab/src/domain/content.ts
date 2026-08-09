import type { CheckItem, Lesson } from './types.ts';

export const LESSONS: readonly Lesson[] = [
  { id: 'overview', title: 'The shape', layer: '—', file: 'read me first', register: 'module', metaphor: 'A workshop with four rooms and strict rules about doors.', lead: 'Every module below lives in one of four layers. Each layer may only depend on the ones beneath it — that single rule is what makes the rest work.' },
  { id: 'domain', title: 'domain', layer: 'domain', file: 'src/domain/types.ts', register: 'module', metaphor: 'Vocabulary painted on the wall.', lead: 'A list of the nouns your project deals with. No behaviour, no logic — the shortest file and often the most consequential, because naming badly here makes everything downstream awkward.' },
  { id: 'storage', title: 'storage', layer: 'engine', file: 'engine/storage.ts', register: 'module', metaphor: 'The filing cabinet in the basement.', lead: 'The only module allowed to touch browser storage. Its real work is migrations: numbered steps that upgrade data saved by an older version of your app.' },
  { id: 'store', title: 'store', layer: 'engine', file: 'engine/store.ts', register: 'module', metaphor: 'The front desk everything passes through.', lead: 'Every change goes through here, and when something changes it announces it so the screen can redraw. Genuinely just a list of listeners and two functions.' },
  { id: 'journal', title: 'journal', layer: 'engine', file: 'engine/journal.ts', register: 'module', metaphor: 'A minute book — struck through, never torn out.', lead: 'Records decisions and never erases. Change your mind and it appends a new entry pointing at the old one, which stays visible forever. A belief expressed as code.' },
  { id: 'derive', title: 'derive', layer: 'engine', file: 'engine/derive.ts', register: 'module', metaphor: 'The accountant, who may only read.', lead: 'Calculations only. Forbidden from saving, fetching, reading the clock, or using randomness — and the ban is enforced by a script that fails the build.' },
  { id: 'viewstate', title: 'view-state', layer: 'engine', file: 'engine/view-state.ts', register: 'module', metaphor: 'Where you are standing and what you are looking at.', lead: 'Camera position, open panels, current selection. Facts about your glance, not about your project. Confusing these with domain state is how apps slowly become incoherent.' },
  { id: 'router', title: 'router', layer: 'engine', file: 'engine/router.ts', register: 'module', metaphor: 'The address on the envelope.', lead: 'Makes the back button work and lets you share a link that opens the same view. The bar at the top of this page is reading it live.' },
  { id: 'canon', title: 'canon', layer: 'canon', file: 'canon/format.ts', register: 'module', metaphor: 'The printing press.', lead: 'Turns data into markup. Cannot save, fetch, or handle a click. That restriction is why a styleguide can render every component with no project loaded.' },
  { id: 'rules', title: 'The three rules', layer: '—', file: 'the whole point', register: 'module', metaphor: 'A rule nobody checks is a suggestion.', lead: 'Everything above collapses into three rules. If you remember nothing else from this lab, remember these.' },
  { id: 'export', title: 'Your progress', layer: '—', file: 'export', register: 'module', metaphor: 'Nothing here is saved. That is deliberate.', lead: 'This prototype has no browser storage, following the house pattern: state lives in memory, and you export it when you want it to survive.' },
  { id: 'when-you-need-a-store', title: 'When you need a store', layer: 'decision', file: 'a transferable judgment', register: 'decision', metaphor: 'A front desk earns its keep only when two rooms need the same answer.', lead: 'Most state does not need a store. A value used in one place is a variable. A value two views must agree on needs a single owner. The signal is shared state, not complexity; reaching for a store before that point is over-building.' },
];

const labels: Record<string, readonly string[]> = {
  domain: ['A type declares what exists, it does not do anything', 'Domain may not import from engine, canon, or shell'],
  storage: ['Only one module in a project touches storage', 'The schema version is written after all migrations succeed, never during'],
  store: ['Views never save directly — every change goes through the store', 'subscribe returns the function that stops listening'],
  journal: ['Superseding appends; the old entry is never edited or removed', 'The history shows both what was decided and what replaced it'],
  derive: ['Same input, same output, always', 'No clock, no randomness, no storage, no network'],
  viewstate: ['View state is not journaled and not migrated', 'If you would not want it in a history log, it is view state'],
  router: ['The URL is a view of view-state, not of domain state', 'Back and forward should never lose domain data'],
  canon: ['Given the same data, canon produces the same markup', 'User text is escaped before it reaches the page'],
};

export const CHECKS: readonly CheckItem[] = Object.entries(labels).flatMap(([lessonId, items]) =>
  items.map((label, index) => ({ id: `${lessonId}-${index}`, lessonId, label })),
);

export const checksFor = (lessonId: string): readonly CheckItem[] => CHECKS.filter((item) => item.lessonId === lessonId);
export const lessonById = (id: string): Lesson => LESSONS.find((lesson) => lesson.id === id) ?? LESSONS[0]!;
