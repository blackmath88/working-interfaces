import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEMO_PORTFOLIO, STATIONS, validatePortfolio } from '../apps/field-manual/public/legacy/reference/adoption-lane-data.mjs';
import { parseRouteInput, routeForIds } from '../apps/field-manual/public/legacy/reference/adoption-lane-routing.mjs';

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
