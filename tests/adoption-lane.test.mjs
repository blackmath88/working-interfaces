import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEMO_PORTFOLIO, STATIONS, validatePortfolio } from '../apps/field-manual/public/legacy/reference/adoption-lane-data.mjs';
import { parseRouteInput, routeForIds } from '../apps/field-manual/public/legacy/reference/adoption-lane-routing.mjs';
import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  toggleTheme,
  updateThemeToggle,
} from '../apps/field-manual/public/legacy/reference/adoption-lane-theme.mjs';

test('demo portfolio has four valid fictional customers and twelve owned use cases', () => {
  assert.equal(DEMO_PORTFOLIO.customers.length, 4);
  assert.equal(DEMO_PORTFOLIO.customers.flatMap(customer => customer.useCases).length, 12);
  assert.equal(DEMO_PORTFOLIO.fictional, true);
  assert.deepEqual(validatePortfolio(DEMO_PORTFOLIO), []);
});

test('customer context is shared and use-case additions stay local', () => {
  const customer = DEMO_PORTFOLIO.customers[0];
  assert.ok(customer.context.governance);
  assert.notStrictEqual(customer.useCases[0].contextAdditions, customer.useCases[1].contextAdditions);
  assert.equal('context' in customer.useCases[0], false);
});

test('portfolio covers canonical route states and special workflow semantics', () => {
  assert.equal(STATIONS.length, 9);
  const cases = DEMO_PORTFOLIO.customers.flatMap(customer => customer.useCases);
  for (const item of cases) assert.ok(STATIONS.some(station => station.id === item.currentStation));
  assert.ok(cases.some(item => Object.values(item.stations).includes('blocked')));
  assert.ok(cases.some(item => Object.values(item.stations).includes('skipped')));
  assert.ok(cases.some(item => Object.values(item.stations).includes('reopened')));
  assert.ok(cases.some(item => item.status === 'No-Go'));
  assert.ok(cases.some(item => item.status === 'Completed'));
});

test('canonical paths parse at every object level and preserve context', () => {
  const customer = routeForIds('sonnenhof');
  const useCase = routeForIds('sonnenhof', 'entlassungsbericht');
  const station = routeForIds('sonnenhof', 'entlassungsbericht', 'business-case');
  const artifact = routeForIds('sonnenhof', 'entlassungsbericht', 'business-case', 'working-assessment');
  assert.equal(parseRouteInput('/control-center').level, 'control');
  assert.equal(parseRouteInput(customer).level, 'customer');
  assert.equal(parseRouteInput(useCase).level, 'use-case');
  assert.equal(parseRouteInput(station).level, 'station');
  assert.deepEqual(parseRouteInput(artifact), {
    path: artifact,
    parts: ['customers', 'sonnenhof', 'use-cases', 'entlassungsbericht', 'stations', 'business-case', 'artifacts', 'working-assessment'],
    panel: null, level: 'artifact', customerId: 'sonnenhof', useCaseId: 'entlassungsbericht', stationId: 'business-case', artifactId: 'working-assessment'
  });
});

test('panel state is deep-linkable and malformed paths fail closed', () => {
  const route = parseRouteInput('#/customers/sonnenhof?panel=customer-context');
  assert.equal(route.level, 'customer');
  assert.equal(route.panel, 'customer-context');
  assert.equal(parseRouteInput('/customers/sonnenhof/oops').level, 'invalid');
});

test('interaction source includes panel accessibility, explicit confirmation, and no long workflow dialog', async () => {
  const app = await readFile(new URL('../apps/field-manual/public/legacy/reference/adoption-lane-app.mjs', import.meta.url), 'utf8');
  const html = await readFile(new URL('../apps/field-manual/public/legacy/reference/case-system-reference-app.html', import.meta.url), 'utf8');
  assert.match(app, /event\.key === 'Escape'/);
  assert.match(app, /panelOpener.*focus/);
  assert.match(app, /history\.pushState\(\{ contextPanel: true \}/);
  assert.match(app, /route\.path === lastRenderedPath/);
  assert.match(app, /showConfirmation/);
  assert.match(html, /aria-labelledby="panelTitle"/);
  assert.equal((html.match(/<dialog/g) || []).length, 1);
  assert.doesNotMatch(html, /<dialog[^>]*>[^]*Station work/);
});

test('secondary accent is semantic and raw aubergine values only define tokens', async () => {
  const css = await readFile(new URL('../apps/field-manual/public/legacy/reference/adoption-lane.css', import.meta.url), 'utf8');
  assert.match(css, /--accent-primary:\s*#0b7778/);
  assert.match(css, /--accent-secondary:\s*#6f4b68/);
  assert.match(css, /--color-judgment:\s*var\(--accent-secondary\)/);
  assert.equal((css.match(/#6f4b68/g) || []).length, 1);
  assert.equal((css.match(/#eee7ec/g) || []).length, 1);
  assert.equal((css.match(/#56374f/g) || []).length, 1);
});

function storageWith(initialValue) {
  const values = new Map();
  if (initialValue !== undefined) values.set(THEME_STORAGE_KEY, initialValue);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    value: key => values.get(key),
  };
}

function themeButton() {
  const attributes = new Map();
  const icon = { textContent: '' };
  return {
    title: '',
    setAttribute: (name, value) => attributes.set(name, value),
    getAttribute: name => attributes.get(name),
    querySelector: selector => selector === '[data-theme-icon]' ? icon : null,
    icon,
  };
}

test('theme storage resolves missing and invalid values to light', () => {
  assert.equal(getStoredTheme(storageWith()), 'light');
  assert.equal(getStoredTheme(storageWith('sepia')), 'light');
});

test('theme storage resolves explicit light and dark values', () => {
  assert.equal(getStoredTheme(storageWith('light')), 'light');
  assert.equal(getStoredTheme(storageWith('dark')), 'dark');
});

test('theme toggle updates the root attribute, storage, and accessible state', () => {
  const storage = storageWith('light');
  const root = { dataset: { theme: 'light' } };
  const button = themeButton();

  assert.equal(toggleTheme({ storage, root, button }), 'dark');
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(storage.value(THEME_STORAGE_KEY), 'dark');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(button.title, 'Switch to light theme');
  assert.equal(button.icon.textContent, '☀');

  updateThemeToggle(button, 'light');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
});

test('theme initializes before styles without using the operating-system preference', async () => {
  const html = await readFile(new URL('../apps/field-manual/public/legacy/reference/case-system-reference-app.html', import.meta.url), 'utf8');
  const themeScriptPosition = html.indexOf("localStorage.getItem('adoption-lane-theme')");
  const stylesheetPosition = html.indexOf('<link rel="stylesheet"');
  assert.ok(themeScriptPosition > -1 && themeScriptPosition < stylesheetPosition);
  assert.match(html, /<html lang="en" data-theme="light">/);
  assert.doesNotMatch(html, /prefers-color-scheme/);
  assert.match(html, /id="themeButton"[^>]*aria-label="Dark theme"[^>]*aria-pressed="false"/);
});
