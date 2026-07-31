import { DEMO_PORTFOLIO, STATIONS, validatePortfolio } from './adoption-lane-data.mjs';
import { parseRouteInput, routeForIds } from './adoption-lane-routing.mjs';

const $ = selector => document.querySelector(selector);
const page = $('#page');
const routeError = $('#routeError');
const panel = $('#contextPanel');
const panelScrim = $('#panelScrim');
const storageKey = 'adoption-lane-portfolio-v1';
const backupKey = 'adoption-lane-portfolio-backup-v1';
let portfolio;
let panelOpener = null;
let pendingConfirmation = null;
let lastRenderedPath = null;
const expandedCustomers = new Set();
const lastStationByUseCase = new Map();

const clone = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const slugClass = value => esc(value).replace(/\s+/g, '-');

class PortfolioRepository {
  load() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return clone(DEMO_PORTFOLIO);
      const parsed = JSON.parse(saved);
      return validatePortfolio(parsed).length ? clone(DEMO_PORTFOLIO) : parsed;
    } catch { return clone(DEMO_PORTFOLIO); }
  }

  replaceWithDemo() {
    const current = localStorage.getItem(storageKey);
    if (current) localStorage.setItem(backupKey, current);
    const candidate = clone(DEMO_PORTFOLIO);
    const errors = validatePortfolio(candidate);
    if (errors.length) throw new Error(errors.join(' '));
    localStorage.setItem(storageKey, JSON.stringify(candidate));
    return candidate;
  }

  restore() {
    const backup = localStorage.getItem(backupKey);
    if (!backup) return null;
    const candidate = JSON.parse(backup);
    if (validatePortfolio(candidate).length) throw new Error('The saved backup is not valid.');
    localStorage.setItem(storageKey, backup);
    localStorage.removeItem(backupKey);
    return candidate;
  }

  hasSavedData() { return Boolean(localStorage.getItem(storageKey)); }
  hasBackup() { return Boolean(localStorage.getItem(backupKey)); }
}

const repository = new PortfolioRepository();
portfolio = repository.load();

function parseRoute() {
  return parseRouteInput(location.hash);
}

function routeFor(customer, useCase, station, artifact) {
  return routeForIds(customer?.id, useCase?.id, station?.id || station, artifact?.id || artifact);
}

function findContext(route) {
  const customer = route.customerId ? portfolio.customers.find(item => item.id === route.customerId) : null;
  const useCase = customer && route.useCaseId ? customer.useCases.find(item => item.id === route.useCaseId) : null;
  const station = route.stationId ? STATIONS.find(item => item.id === route.stationId) : null;
  const artifact = useCase && route.artifactId === useCase.artifact.id ? useCase.artifact : null;
  return { customer, useCase, station, artifact };
}

function header(kicker, title, summary, status = '') {
  return `<header class="page-header"><div><div class="eyebrow">${esc(kicker)}</div><h1 title="${esc(title)}">${esc(title)}</h1><p>${esc(summary)}</p></div>${status ? `<span class="status ${slugClass(status)}">${esc(status)}</span>` : ''}</header>`;
}

function renderNavigation(route, context) {
  $('#customerNavigation').innerHTML = portfolio.customers.map(customer => {
    const selected = customer.id === route.customerId;
    if (selected) expandedCustomers.add(customer.id);
    const expanded = expandedCustomers.has(customer.id);
    return `<div class="customer-group">
      <div class="customer-row">
        <button class="expand-button" data-expand-customer="${esc(customer.id)}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${esc(customer.name)}" aria-expanded="${expanded}">${expanded ? '−' : '+'}</button>
        <a class="customer-link" href="#${routeFor(customer)}" ${route.level === 'customer' && selected ? 'aria-current="page"' : ''} title="${esc(customer.name)}"><span>${esc(customer.name)}</span></a>
      </div>
      <div class="use-case-list" ${expanded ? '' : 'hidden'}>${customer.useCases.map(useCase => `<a class="use-case-link" href="#${routeFor(customer, useCase)}" ${useCase.id === route.useCaseId && route.level === 'use-case' ? 'aria-current="page"' : ''} title="${esc(useCase.title)}"><span>${esc(useCase.title)}</span></a>`).join('')}</div>
    </div>`;
  }).join('');
  document.querySelectorAll('.control-link').forEach(link => link.toggleAttribute('aria-current', route.level === 'control'));
}

function renderBreadcrumbs(route, { customer, useCase, station, artifact }) {
  const items = [{ label: 'Adoption Lane', path: '/control-center' }];
  if (customer) items.push({ label: customer.name, path: routeFor(customer) });
  if (useCase) items.push({ label: useCase.title, path: routeFor(customer, useCase) });
  if (station) items.push({ label: station.name, path: routeFor(customer, useCase, station) });
  if (artifact) items.push({ label: artifact.title, path: routeFor(customer, useCase, station, artifact) });
  $('#breadcrumbs').innerHTML = items.map((item, index) => {
    const current = index === items.length - 1;
    const middle = index > 0 && index < items.length - 1 ? 'crumb-middle' : '';
    return `${index ? '<span class="separator" aria-hidden="true">/</span>' : ''}${current ? `<span class="${middle}" aria-current="page" title="${esc(item.label)}">${esc(item.label)}</span>` : `<a class="${middle}" href="#${item.path}" title="${esc(item.label)}" aria-label="${esc(item.label)}">${esc(item.label)}</a>`}`;
  }).join('');
}

function renderControlCenter() {
  const useCases = portfolio.customers.flatMap(customer => customer.useCases.map(useCase => ({ customer, useCase })));
  const blocked = useCases.filter(({ useCase }) => useCase.status === 'Blocked' || useCase.status === 'No-Go').length;
  return `${header('Portfolio', 'Control Center', 'Move from customer context into a use case, journey station, and attributable artifact.')}
    <section class="grid" aria-label="Portfolio summary">
      <article class="card pad metric span-4"><div class="eyebrow">Customers</div><strong>${portfolio.customers.length}</strong><p>Fictional organizations with shared context.</p></article>
      <article class="card pad metric span-4"><div class="eyebrow">Use cases</div><strong>${useCases.length}</strong><p>Across new, active, completed, and concluded states.</p></article>
      <article class="card pad metric span-4"><div class="eyebrow judgment">Needs attention</div><strong>${blocked}</strong><p>Blocked or No-Go cases needing judgment.</p></article>
      ${portfolio.customers.map(customer => `<article class="card pad span-6"><div class="eyebrow judgment">Customer</div><h2><a href="#${routeFor(customer)}">${esc(customer.name)}</a></h2><p>${esc(customer.context.strategic)}</p><div class="list-row"><span>${customer.useCases.length} use cases</span><span class="status ${slugClass(customer.status)}">${esc(customer.status)}</span></div></article>`).join('')}
    </section>`;
}

function renderCustomer(customer) {
  return `${header('Customer', customer.name, customer.context.strategic, customer.status)}
    <section class="grid">
      <article class="card pad span-5 context-summary"><div class="eyebrow judgment">Shared customer context</div><h2>Inherited across use cases</h2><p>${esc(customer.context.systems)}</p><button class="button quiet" data-panel="customer-context">Inspect shared context</button></article>
      <article class="card pad span-7"><div class="eyebrow">Use cases</div><ul class="list">${customer.useCases.map(useCase => `<li class="list-row"><div><a href="#${routeFor(customer, useCase)}">${esc(useCase.title)}</a><p>${esc(useCase.summary)}</p></div><span class="status ${slugClass(useCase.status)}">${esc(useCase.status)}</span></li>`).join('')}</ul></article>
    </section>`;
}

function routeEngine(customer, useCase) {
  return `<div class="route-wrap" aria-label="Nine-stage Route Engine"><div class="route-engine">${STATIONS.map((station, index) => {
    const state = useCase.stations[station.id] || 'upcoming';
    return `<a class="station-stop ${esc(state)}" href="#${routeFor(customer, useCase, station)}" aria-label="Station ${index + 1}: ${esc(station.name)}, ${esc(state)}" title="${esc(station.name)} · ${esc(state)}"><span>${String(index + 1).padStart(2, '0')}</span><br>${esc(station.name)}</a>`;
  }).join('')}</div></div><div class="route-legend"><span>Process/current</span><span class="judgment-key">Skipped/reopened</span><span class="blocked-key">Blocked</span></div>`;
}

function useCaseSwitcher(customer, current) {
  return `<label class="field-label" for="useCaseSwitch">Switch use case</label><select id="useCaseSwitch">${customer.useCases.map(item => `<option value="${esc(item.id)}" ${item.id === current.id ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select>`;
}

function renderUseCase(customer, useCase) {
  const current = STATIONS.find(station => station.id === useCase.currentStation);
  const currentPhaseStations = STATIONS.filter(station => station.phase === current.phase);
  return `${header('Use case · Journey', useCase.title, useCase.summary, useCase.status)}
    <section class="grid">
      <article class="card pad span-8 context-summary"><div class="eyebrow judgment">Customer context · inherited</div><h2>${esc(customer.name)}</h2><p>${esc(customer.context.governance)}</p><button class="button quiet" data-panel="customer-context">Open shared context</button> <button class="button quiet" data-panel="use-case-metadata">Use-case metadata</button></article>
      <aside class="card pad span-4">${useCaseSwitcher(customer, useCase)}<p><b>Current phase</b><br>${esc(current.phase)}</p><p><b>Current station</b><br><a href="#${routeFor(customer, useCase, current)}">${esc(current.name)}</a></p></aside>
      <article class="card pad span-12"><div class="eyebrow">Complete journey</div><h2>Route Engine</h2>${routeEngine(customer, useCase)}</article>
      <article class="card pad span-7"><div class="eyebrow">Current phase detail</div><h2>${esc(current.phase)}</h2><p>The complete route remains above; this workspace only expands the current phase and its artifacts.</p><details class="phase-detail" open><summary>${esc(current.phase)} stations</summary><ul class="list">${currentPhaseStations.map(station => `<li class="list-row"><a href="#${routeFor(customer, useCase, station)}">${esc(station.name)}</a><span class="status">${esc(useCase.stations[station.id])}</span></li>`).join('')}</ul></details></article>
      <aside class="card pad span-5"><div class="eyebrow judgment">Decisions & blockers</div>${useCase.blockers.length ? useCase.blockers.map(text => `<div class="notice judgment">${esc(text)}</div>`).join('') : '<p>No major blocker is recorded.</p>'}<h3>Recent meaningful activity</h3><ul>${useCase.activity.map(item => `<li>${esc(item)}</li>`).join('')}</ul></aside>
    </section>`;
}

function stationStateNote(customer, useCase, station) {
  const state = useCase.stations[station.id];
  if (!['blocked', 'skipped', 'reopened'].includes(state)) return '';
  return `<div class="notice judgment"><b>${esc(state[0].toUpperCase() + state.slice(1))}</b><br>${esc(useCase.reasons[station.id] || 'A reason has not yet been recorded.')}<br><button class="text-button" data-panel="station-reason">Inspect explanation</button></div>`;
}

function renderStation(customer, useCase, station) {
  lastStationByUseCase.set(`${customer.id}/${useCase.id}`, station.id);
  const isBusinessCase = station.id === 'business-case';
  const isDecision = station.id === 'decision';
  return `<a class="parent-link" href="#${routeFor(customer, useCase)}">← Journey overview</a>
    ${header(`Station · ${station.phase}`, station.name, `Primary workspace for ${useCase.title}.`, useCase.stations[station.id])}
    ${stationStateNote(customer, useCase, station)}
    <section class="grid">
      <article class="card pad span-8"><div class="eyebrow">Station work</div><h2>${isBusinessCase ? 'Business-case evidence' : isDecision ? 'Decision review' : `${esc(station.name)} working area`}</h2>
      ${isBusinessCase ? `<dl class="definition-list">${Object.entries(useCase.businessCase).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>` : `<p>This is deliberately lightweight, domain-specific prototype content. It demonstrates a full-page station without pretending the workflow is production-complete.</p><div class="inherited"><b>Inherited customer constraint</b><br>${esc(customer.context.governance)}</div>`}
      ${isDecision ? `<div class="notice judgment"><b>Current recommendation</b><br>${useCase.status === 'No-Go' ? 'Concluded as No-Go' : 'Proceed only when the recorded evidence threshold is met.'}</div><button class="button judgment" id="noGoButton">Confirm No-Go conclusion</button>` : ''}
      </article>
      <aside class="card pad span-4"><div class="eyebrow judgment">Supporting context</div><button class="text-button" data-panel="customer-context">Customer shared context →</button><button class="text-button" data-panel="provenance">Provenance & history →</button><h3>Artifact</h3><a class="artifact-link" href="#${routeFor(customer, useCase, station, useCase.artifact)}"><b>${esc(useCase.artifact.title)}</b><br><span>Open major artifact workspace →</span></a></aside>
      <article class="card pad span-12"><div class="eyebrow">Journey position</div>${routeEngine(customer, useCase)}</article>
    </section>`;
}

function renderArtifact(customer, useCase, station, artifact) {
  return `<a class="parent-link" href="#${routeFor(customer, useCase, station)}">← ${esc(station.name)} station</a>
    ${header('Major artifact', artifact.title, `${useCase.title} · ${station.name}`)}
    <section class="grid"><article class="card pad span-8"><div class="eyebrow judgment">Readable artifact</div><p class="artifact-body">${esc(artifact.body)}</p><hr><h2>Decision trace</h2><p>${useCase.status === 'No-Go' ? 'The case was concluded as No-Go; the earlier recommendation is retained as superseded history.' : 'Decision pending or conditional; see revision history for the evidence trail.'}</p></article>
    <aside class="card pad span-4"><div class="eyebrow judgment">Meaning & provenance</div><p>${esc(artifact.provenance)}</p><button class="button quiet" data-panel="provenance">Open provenance</button><button class="button quiet" data-panel="revision-history">Revision history</button></aside></section>`;
}

function renderInvalid(message) {
  routeError.hidden = false;
  routeError.innerHTML = `${esc(message)} <a href="#/control-center">Return to Control Center</a>`;
  return `${header('Not found', 'This route is unavailable', 'The object may have been deleted or the link is malformed.')}`;
}

function render() {
  const route = parseRoute();
  const context = findContext(route);
  if (route.path === lastRenderedPath) {
    syncPanel(route, context);
    return;
  }
  routeError.hidden = true;
  let html;
  if (route.level === 'control') html = renderControlCenter();
  else if (!context.customer) html = renderInvalid('Customer not found.');
  else if (route.level === 'customer') html = renderCustomer(context.customer);
  else if (!context.useCase) html = renderInvalid('Use case not found for this customer.');
  else if (route.level === 'use-case') html = renderUseCase(context.customer, context.useCase);
  else if (!context.station) html = renderInvalid('Station not found.');
  else if (route.level === 'station') html = renderStation(context.customer, context.useCase, context.station);
  else if (!context.artifact) html = renderInvalid('Artifact not found.');
  else if (route.level === 'artifact') html = renderArtifact(context.customer, context.useCase, context.station, context.artifact);
  else html = renderInvalid('Malformed route.');
  page.innerHTML = html;
  renderNavigation(route, context);
  renderBreadcrumbs(route, context);
  lastRenderedPath = route.path;
  syncPanel(route, context);
  document.title = `${context.artifact?.title || context.station?.name || context.useCase?.title || context.customer?.name || 'Control Center'} · Adoption Lane`;
}

function panelContent(kind, { customer, useCase, station }) {
  if (kind === 'customer-context' && customer) return {
    kind: 'Customer context', title: customer.name, subtitle: 'Shared and inherited across this customer’s use cases.',
    body: Object.entries(customer.context).map(([key, value]) => `<h3>${esc(key)}</h3>${value ? `<p>${esc(value)}</p>` : '<div class="empty">Not yet documented</div>'}`).join('')
  };
  if (kind === 'station-reason' && useCase && station) return { kind: 'Route state', title: `${station.name} · ${useCase.stations[station.id]}`, subtitle: useCase.title, body: `<p>${esc(useCase.reasons[station.id] || 'No explanation is recorded yet.')}</p>` };
  if ((kind === 'provenance' || kind === 'revision-history') && useCase) return { kind: kind === 'provenance' ? 'Provenance' : 'Revision history', title: useCase.artifact.title, subtitle: 'Supporting context; the artifact remains underneath.', body: `<h3>Source trail</h3><p>${esc(useCase.artifact.provenance)}</p><h3>Revisions</h3><ol>${useCase.artifact.revisions.map(item => `<li>${esc(item)}</li>`).join('')}</ol>` };
  if (kind === 'use-case-metadata' && useCase) return { kind: 'Use-case metadata', title: useCase.title, subtitle: 'Compact contextual information.', body: `<dl class="definition-list"><dt>Status</dt><dd>${esc(useCase.status)}</dd><dt>Current station</dt><dd>${esc(useCase.currentStation)}</dd><dt>Local addition</dt><dd>${esc(useCase.contextAdditions)}</dd></dl>` };
  return { kind: 'Panel unavailable', title: 'Supporting context not found', subtitle: '', body: '<div class="empty">This panel has no content for the current route.</div>' };
}

function syncPanel(route, context) {
  if (!route.panel) return closePanelVisual();
  const content = panelContent(route.panel, context);
  $('#panelKind').textContent = content.kind;
  $('#panelTitle').textContent = content.title;
  $('#panelSubtitle').textContent = content.subtitle;
  $('#panelBody').innerHTML = content.body;
  $('#panelActions').innerHTML = '<button class="button quiet" data-close-panel>Close</button>';
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  panelScrim.hidden = false;
  document.body.classList.add('panel-open');
  requestAnimationFrame(() => $('#panelClose').focus());
}

function closePanelVisual() {
  const wasOpen = panel.classList.contains('open');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  panelScrim.hidden = true;
  document.body.classList.remove('panel-open');
  if (wasOpen && panelOpener?.isConnected) requestAnimationFrame(() => panelOpener.focus());
  panelOpener = null;
}

function openPanel(kind, opener) {
  panelOpener = opener;
  const route = parseRoute();
  history.pushState({ contextPanel: true }, '', `#${route.path}?panel=${encodeURIComponent(kind)}`);
  render();
}

function closePanel() {
  const route = parseRoute();
  if (!route.panel) return;
  if (history.state?.contextPanel) history.back();
  else {
    history.replaceState(null, '', `#${route.path}`);
    render();
  }
}

function showConfirmation({ title, body, confirmLabel, onConfirm }) {
  $('#dialogTitle').textContent = title;
  $('#dialogBody').textContent = body;
  $('#dialogConfirm').textContent = confirmLabel;
  pendingConfirmation = onConfirm;
  $('#confirmDialog').showModal();
}

function toast(message) {
  const target = $('#toast');
  target.textContent = message;
  target.classList.add('show');
  setTimeout(() => target.classList.remove('show'), 1800);
}

document.addEventListener('click', event => {
  const expand = event.target.closest('[data-expand-customer]');
  if (expand) {
    const id = expand.dataset.expandCustomer;
    expandedCustomers.has(id) ? expandedCustomers.delete(id) : expandedCustomers.add(id);
    renderNavigation(parseRoute(), findContext(parseRoute()));
    return;
  }
  const trigger = event.target.closest('[data-panel]');
  if (trigger) openPanel(trigger.dataset.panel, trigger);
  if (event.target.closest('[data-close-panel]') || event.target === panelScrim || event.target === $('#panelClose')) closePanel();
  if (event.target.closest('[data-route]')) $('#primaryNav').classList.remove('open');
});

document.addEventListener('change', event => {
  if (event.target.id !== 'useCaseSwitch') return;
  const route = parseRoute();
  const customer = portfolio.customers.find(item => item.id === route.customerId);
  const next = customer?.useCases.find(item => item.id === event.target.value);
  if (!next) return;
  const lastStation = lastStationByUseCase.get(`${customer.id}/${next.id}`);
  location.hash = lastStation ? routeFor(customer, next, lastStation) : routeFor(customer, next);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && parseRoute().panel) closePanel();
});

window.addEventListener('hashchange', render);
$('#menuButton').addEventListener('click', () => {
  const open = $('#primaryNav').classList.toggle('open');
  $('#menuButton').setAttribute('aria-expanded', String(open));
});
$('#themeButton').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('adoption-lane-theme', theme);
});

$('#loadDemoButton').addEventListener('click', () => showConfirmation({
  title: 'Demo-Daten laden?',
  body: repository.hasSavedData() ? 'This replaces saved portfolio data. The current version will be retained as a restorable backup.' : 'This explicitly saves the fictional demo portfolio in this browser.',
  confirmLabel: 'Demo-Daten laden',
  onConfirm: () => {
    portfolio = repository.replaceWithDemo();
    location.hash = '/control-center';
    render();
    toast('Demo data loaded; previous data backed up when available.');
  }
}));

$('#restoreDemoButton').addEventListener('click', () => {
  if (!repository.hasBackup()) return toast('No previous data backup is available.');
  showConfirmation({ title: 'Restore previous data?', body: 'This replaces the active demo portfolio with the last saved backup.', confirmLabel: 'Restore', onConfirm: () => { portfolio = repository.restore(); location.hash = '/control-center'; render(); toast('Previous data restored.'); } });
});

$('#confirmDialog').addEventListener('close', () => {
  if ($('#confirmDialog').returnValue === 'confirm' && pendingConfirmation) pendingConfirmation();
  pendingConfirmation = null;
});

page.addEventListener('click', event => {
  if (event.target.id !== 'noGoButton') return;
  showConfirmation({ title: 'Conclude this use case as No-Go?', body: 'This demo treats the conclusion as irreversible and retains prior recommendations as superseded history.', confirmLabel: 'Confirm No-Go', onConfirm: () => toast('No-Go conclusion confirmed in the demo.') });
});

document.documentElement.dataset.theme = localStorage.getItem('adoption-lane-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
if (!location.hash) history.replaceState(null, '', '#/control-center');
render();
