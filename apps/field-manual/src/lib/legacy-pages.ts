export type LegacyPage = {
  slug: string;
  title: string;
  summary: string;
  source: string;
};

export const manualPages: LegacyPage[] = [
  {
    slug: '01-interface-field-guide',
    title: 'Interface Field Guide',
    summary: 'Broad contemporary UI direction, reusable patterns, and visual references beyond generic SaaS styling.',
    source: 'manual/01-interface-field-guide.html',
  },
  {
    slug: '02-adoption-lane-decision-instrument',
    title: 'Adoption Lane Decision Instrument',
    summary: 'Provenance, gates, uncertainty, route logic, and equal No-Go outcomes for the stricter method lane.',
    source: 'manual/02-adoption-lane-decision-instrument.html',
  },
  {
    slug: '03-case-component-atlas',
    title: 'Case Component Atlas',
    summary: 'The shared shell across project, change, and consulting domains.',
    source: 'manual/03-case-component-atlas.html',
  },
  {
    slug: '04-specialized-components',
    title: 'Specialized Components',
    summary: 'Inputs, money, evidence, people, statistics, and structured states.',
    source: 'manual/04-specialized-components.html',
  },
  {
    slug: '05-analytical-components',
    title: 'Analytical Components',
    summary: 'Polished ranges, discrete judgment, intervals, and production-library references.',
    source: 'manual/05-analytical-components.html',
  },
  {
    slug: '06-typography-color-lab',
    title: 'Typography + Color Lab',
    summary: 'Interactive type roles, semantic color, density, contrast, and realistic previews.',
    source: 'manual/06-typography-color-lab.html',
  },
  {
    slug: '07-page-compositions',
    title: 'Page Compositions',
    summary: 'Heroes, portfolio views, workspaces, decision reviews, dossiers, and mobile.',
    source: 'manual/07-page-compositions.html',
  },
  {
    slug: '08-interaction-behavior',
    title: 'Interaction + Behavior',
    summary: 'Save, carry forward, supersede, skip, conclude, reopen, and conflict behavior.',
    source: 'manual/08-interaction-behavior.html',
  },
  {
    slug: '09-object-model',
    title: 'Object Model',
    summary: 'How cases, stages, claims, evidence, judgments, decisions, and artifacts connect.',
    source: 'manual/09-object-model.html',
  },
  {
    slug: '10-state-machine',
    title: 'State Machine',
    summary: 'Case and stage states with explicit prerequisites and consequences.',
    source: 'manual/10-state-machine.html',
  },
  {
    slug: '11-ux-writing',
    title: 'Content + UX Writing',
    summary: 'Precise interface language and explicit origins for information.',
    source: 'manual/11-ux-writing.html',
  },
  {
    slug: '12-accessibility-lab',
    title: 'Accessibility Lab',
    summary: 'Stress-test grayscale, projection, zoom, mobile, long labels, and reduced motion.',
    source: 'manual/12-accessibility-lab.html',
  },
  {
    slug: '13-motion-language',
    title: 'Motion Language',
    summary: 'Motion for causality: saving, carrying, superseding, revealing, and route travel.',
    source: 'manual/13-motion-language.html',
  },
];

export const referencePages: LegacyPage[] = [
  {
    slug: 'case-system-reference-app',
    title: 'Complete Reference App',
    summary: 'One cohesive implementation that switches domain mode without changing the shell grammar.',
    source: 'reference/case-system-reference-app.html',
  },
];

export function getManualPage(slug: string) {
  return manualPages.find((page) => page.slug === slug);
}

export function getReferencePage(slug: string) {
  return referencePages.find((page) => page.slug === slug);
}