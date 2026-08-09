import { esc, fmt } from '@working-interfaces/scaffold';
import { checksFor } from '../domain/content.ts';
import type { Lesson } from '../domain/types.ts';
import { demoView } from './labs.ts';
import { diagramView } from './diagram.ts';

const SNIPPETS: Readonly<Record<string, string>> = {
  domain: `<span class="c">// Nothing happens here. It only declares what exists.</span>\nexport type Stakeholder = {\n  readonly id: string\n  name: string\n  influence: 'low' | 'medium' | 'high'\n}`,
  storage: `<span class="c">// Numbered steps. The version is written after each one succeeds.</span>\nconst storage = createStorage({ driver: memoryDriver() })\nconst report = storage.migrate([\n  { name: 'add-influence', run: (notes) =&gt; { <span class="c">/* … */</span> } },\n])\n<span class="c">// report.failed names the step that stopped the run, if any.</span>\nconst list = storage.read&lt;Stakeholder[]&gt;(storage.key('stakeholders'), [])`,
  store: `const stop = subscribe(() =&gt; renderEverything())\n\nexport function addStakeholder(s: Stakeholder) {\n  storage.write(storage.key('stakeholders'), [...all(), s])\n  notify()                    <span class="c">// tell every view</span>\n}`,
  journal: `supersede(storage, journalKey, previousId, {\n  subjectId: 'vorhaben-04',\n  decision: 'Use the shorter route',\n  rationale: 'The long route failed the No-Go check',\n  alternatives_rejected: 'Keep the long route',\n}, resolveAuthor, 'lab')\n<span class="c">// Both entries remain. Nothing is edited or removed.</span>`,
  derive: `export function influenceScore(list: Stakeholder[]): number {\n  return list.filter(s =&gt; s.influence === 'high').length * 3\n}\n<span class="c">// const now = Date.now()  ← would fail the build</span>`,
  viewstate: `const view = createViewState({ lesson: 'overview', log: [],\n  demoName: '', panelOpen: false })\nview.set({ panelOpen: true })     <span class="c">// merges, doesn't replace</span>`,
  router: `navigate(['router'], { focus: 's-14' })\n<span class="c">// #/router?focus=s-14</span>\n\nonRouteChange(({ path, params }) =&gt; {\n  view.set({ lesson: path[0], selectedId: params.focus })\n})`,
  canon: `export function stakeholderCard(s: Stakeholder): string {\n  return \`&lt;article&gt;&lt;h3&gt;\${esc(s.name)}&lt;/h3&gt;&lt;/article&gt;\`\n}\n<span class="c">// The click handler lives in the view, not here.</span>`,
};

const RESOURCES: Readonly<Record<string, ReadonlyArray<readonly [string, string, string]>>> = {
  domain: [['TypeScript: everyday types', 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html', 'Covers most of what a types file ever needs.']],
  storage: [['Web Storage API', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API', 'What this replaces with an injectable memory driver.'], ['Schema migrations', 'https://martinfowler.com/bliki/DatabaseMigration.html', 'Where the numbered-step idea comes from.']],
  store: [['The observer pattern', 'https://refactoring.guru/design-patterns/observer', 'subscribe and notify, by its proper name.']],
  journal: [['Event sourcing', 'https://martinfowler.com/eaaDev/EventSourcing.html', 'The grown-up version: store changes, derive the present.']],
  derive: [['Pure functions', 'https://en.wikipedia.org/wiki/Pure_function', 'The property the purity check enforces.'], ['Hexagonal architecture', 'https://alistair.cockburn.us/hexagonal-architecture/', 'Why the layers point the way they do.']],
  router: [['History API', 'https://developer.mozilla.org/en-US/docs/Web/API/History_API', 'The machinery behind the back button.']],
  canon: [['Cross-site scripting', 'https://owasp.org/www-community/attacks/xss/', 'Why esc() exists. Short, and it makes the habit stick.']],
};

function checksView(lessonId: string, got: boolean): string {
  const items = checksFor(lessonId);
  if (!items.length) return '';
  return `<div class="gate"><h3>Did it land?</h3><p class="mono gate-note">Check both, then mark the module understood.</p>
    <div class="checks">${items.map((item) => `<label class="check"><input type="checkbox" data-check="${esc(item.id)}"><span>${esc(item.label)}</span></label>`).join('')}</div>
    <div class="row"><button class="btn${got ? '' : ' btn--p'}" data-got="${esc(lessonId)}">${got ? 'Understood ✓ — unmark' : 'I understand this module'}</button></div></div>`;
}

function resourcesView(lessonId: string): string {
  const resources = RESOURCES[lessonId];
  if (!resources) return '';
  return `<h2>Read further</h2><div class="links">${resources.map(([title, url, detail]) => `<div class="link"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}</a><p>${esc(detail)}</p></div>`).join('')}</div>`;
}

export interface LessonViewInput {
  readonly lesson: Lesson;
  readonly got: boolean;
  readonly understood: number;
  readonly total: number;
  readonly snapshotJson: string;
}

export function lessonView({ lesson, got, understood, total, snapshotJson }: LessonViewInput): string {
  let body = `<div class="kicker">${esc(lesson.layer === '—' ? 'Scaffold Lab' : `${lesson.layer} layer`)}</div><h1>${esc(lesson.title)}</h1><div class="file">${esc(lesson.file)}</div><p class="metaphor">${esc(lesson.metaphor)}</p><p class="lead">${esc(lesson.lead)}</p>`;

  if (lesson.id === 'overview') {
    body += `${diagramView(null)}<p>Click any box to jump to that module. Each demo runs the actual mechanism imported from the scaffold package.</p><h2>Why this project is the lesson</h2><p>The source is separated into domain, canon, views, and a composition root. There is deliberately no local engine directory.</p><p>When the journal refuses to delete, it refuses because the imported API has no delete function.</p>`;
  } else if (lesson.id === 'rules') {
    body += `<div class="gate"><h3>Dependencies point downward</h3><p>Domain knows nothing. Engine may use domain. Canon may use domain but never engine. Shell may use all three.</p></div><div class="gate gate-blocked"><h3>Everything goes through the store</h3><p>A direct write leaves subscribers stale; the store demo makes that disagreement visible.</p></div><div class="gate"><h3>Corrections are additions</h3><p>Nothing recorded is rewritten or removed. A correction appends and points at what it replaces.</p></div><h2>A rule nobody checks is a suggestion</h2><p>The purity guard, subscription boundary, and absent journal delete operation make these rules executable.</p>`;
  } else if (lesson.id === 'export') {
    body += `<div class="lab"><div class="lab-h"><span class="t">Snapshot</span><span class="s">${fmt(understood)} of ${fmt(total)} modules marked understood</span></div><div class="lab-b"><div class="row"><button class="btn btn--p" data-demo="copy">Copy JSON</button><button class="btn" data-demo="download">Download</button></div><pre id="json">${esc(snapshotJson)}</pre><p class="warnline">No browser storage — closing the tab discards everything. Copy before closing.</p></div></div><h2>Why there is no save button</h2><p>Storage brings migrations and versioning. Exporting keeps that decision visible and produces a portable file.</p>`;
  } else {
    const snippet = SNIPPETS[lesson.id];
    if (snippet) body += `<pre><code>${snippet}</code></pre>`;
    body += demoView(lesson.id);
    body += checksView(lesson.id, got);
    body += resourcesView(lesson.id);
  }

  return body;
}
