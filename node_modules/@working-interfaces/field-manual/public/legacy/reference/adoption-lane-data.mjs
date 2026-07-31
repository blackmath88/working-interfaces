export const STATIONS = [
  ['opportunity', 'Opportunity', 'Discover'],
  ['stakeholders', 'Stakeholders', 'Discover'],
  ['business-case', 'Business Case', 'Frame'],
  ['data-readiness', 'Data Readiness', 'Frame'],
  ['solution-shape', 'Solution Shape', 'Validate'],
  ['evidence', 'Evidence', 'Validate'],
  ['decision', 'Decision', 'Decide'],
  ['adoption', 'Adoption', 'Embed'],
  ['dossier', 'Final Dossier', 'Embed']
].map(([id, name, phase]) => ({ id, name, phase }));

const stationStates = (current, overrides = {}) => Object.fromEntries(STATIONS.map((station, index) => {
  const activeIndex = STATIONS.findIndex(item => item.id === current);
  return [station.id, overrides[station.id] || (index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming')];
}));

const useCase = (id, title, status, currentStation, extras = {}) => ({
  id, title, status, currentStation,
  summary: extras.summary || 'A focused adoption case with explicit evidence and decision gates.',
  contextAdditions: extras.contextAdditions || 'Local process owners and source material are being identified.',
  blockers: extras.blockers || [],
  stations: stationStates(currentStation, extras.stationOverrides),
  reasons: extras.reasons || {},
  artifact: {
    id: 'working-assessment',
    title: extras.artifactTitle || 'Working assessment',
    body: extras.artifactBody || 'Prototype content: the assessment records assumptions, evidence gaps, and the next decision.',
    provenance: extras.provenance || 'Created from workshop notes; verification is still in progress.',
    revisions: extras.revisions || ['Initial working version']
  },
  businessCase: extras.businessCase || {
    volume: 'To verify', time: 'To verify', cost: 'Not yet approved',
    hypothesis: 'Reduce avoidable coordination work while retaining human review.',
    gaps: 'Baseline sample and process variance.',
    lens: 'Benefits depend on adoption, governance, and integration—not model quality alone.'
  },
  activity: extras.activity || ['Use case reviewed', 'Next station identified']
});

export const DEMO_PORTFOLIO = {
  version: 1,
  fictional: true,
  customers: [
    {
      id: 'sonnenhof', name: 'Sonnenhof Gesundheitsverbund', status: 'Active',
      context: {
        strategic: 'Regional care network improving continuity without weakening clinical accountability.',
        systems: 'Fragmented clinical systems with centralized IT and decentralized operational units.',
        governance: 'Regulated health data and strong documentation burden.',
        stakeholders: 'Clinical services, records management, IT, data protection, and patient operations.',
        organization: 'Shared standards are implemented locally by semi-autonomous care units.',
        limitations: 'Cross-system identifiers and discharge-quality baselines remain incomplete.'
      },
      useCases: [
        useCase('entlassungsbericht', 'Entlassungsbericht vorbereiten', 'Phase 2', 'data-readiness', {
          summary: 'Prepare a clinician-reviewed discharge-report draft from fragmented source records.',
          contextAdditions: 'Neurology and internal medicine use different discharge templates.',
          artifactTitle: 'Business-case and readiness assessment',
          businessCase: { volume: '1,850 discharges/month', time: '18–42 min/report', cost: 'CHF 72–118/hour blended', hypothesis: 'Recover documentation time and reduce missing follow-up instructions.', gaps: 'Time sample covers two of six units; coding rework is not quantified.', lens: 'Clinical sign-off remains mandatory; value relies on source completeness and workflow fit.' },
          provenance: 'Volumes: operations export, 14 May. Time range: 12 observed cases. Cost range: finance assumption.',
          revisions: ['v3 · Baseline range corrected', 'v2 · Neurology evidence added', 'v1 · Workshop draft'],
          activity: ['Baseline range superseded after observation', 'Data Readiness opened', 'Privacy stakeholder added']
        }),
        useCase('richtlinien-assistent', 'Richtlinien-Assistent', 'Blocked', 'evidence', {
          summary: 'Help staff find the applicable care guideline with visible source provenance.',
          blockers: ['Publication ownership for local directives is unresolved.'],
          stationOverrides: { evidence: 'blocked' },
          reasons: { evidence: 'Blocked until Medical Governance assigns an owner for superseded directives.' }
        }),
        useCase('terminabsagen', 'Terminabsagen reduzieren', 'New', 'opportunity', {
          summary: 'Explore respectful interventions that reduce avoidable outpatient no-shows.'
        })
      ]
    },
    {
      id: 'helvetic-field', name: 'Helvetic Field Services', status: 'Active',
      context: {
        strategic: 'Protect response time and margin while experienced technicians retire.',
        systems: 'Legacy ERP, mobile service tooling, and multilingual unstructured manuals.',
        governance: 'Operational safety and traceable recommendations are mandatory.',
        stakeholders: 'Field technicians, dispatch, service engineering, parts, and regional managers.',
        organization: 'Knowledge is concentrated in experienced staff across language regions.',
        limitations: 'Failure codes are inconsistent and service notes vary greatly in quality.'
      },
      useCases: [
        useCase('servicebericht', 'Servicebericht-Assistent', 'Phase 1', 'business-case', { summary: 'Draft structured service reports from technician notes and job metadata.' }),
        useCase('ersatzteil', 'Ersatzteilvorschlag', 'Reopened', 'solution-shape', {
          summary: 'Suggest compatible parts with a visible confidence and catalogue source.',
          stationOverrides: { 'data-readiness': 'reopened', 'solution-shape': 'current' },
          reasons: { 'data-readiness': 'Reopened after three regional catalogues produced conflicting compatibility rules.' },
          activity: ['Data Readiness reopened', 'Prior compatibility decision superseded', 'Catalogue owner assigned']
        }),
        useCase('stoerungstriage', 'Störungstriage', 'Phase 3', 'adoption', { summary: 'Route incoming faults by urgency, equipment family, and required expertise.' })
      ]
    },
    {
      id: 'nordstadt', name: 'Nordstadt Hochschule mit Fakultät für interdisziplinäre Transformationsforschung', status: 'Context incomplete',
      context: {
        strategic: 'Reduce administrative friction while respecting distributed governance.',
        systems: 'Mixed digital maturity and faculty-specific repositories.',
        governance: 'Sensitive employee and research data; high participation requirements.',
        stakeholders: 'Faculties, central services, works council, research office, and information security.',
        organization: 'Semi-autonomous faculties require consultation before shared process changes.',
        limitations: ''
      },
      useCases: [
        useCase('wissensassistent', 'Administrativer Wissensassistent', 'Phase 2', 'solution-shape'),
        useCase('vertrags-triage', 'Forschungsvertrags-Triage', 'Skipped station', 'decision', {
          stationOverrides: { evidence: 'skipped', decision: 'current' },
          reasons: { evidence: 'Skipped for this discovery cycle because the required contract sample is covered by the existing legal audit.' }
        }),
        useCase('onboarding', 'Mitarbeitenden-Onboarding für dezentrale Institute und fakultätsübergreifende Forschungszentren', 'New', 'stakeholders')
      ]
    },
    {
      id: 'alpinia', name: 'Alpinia Versicherung', status: 'Active',
      context: {
        strategic: 'Improve claims throughput while preserving explainability and audit readiness.',
        systems: 'Document-heavy claims processing across multiple legacy systems.',
        governance: 'Regulated financial environment with centralized governance and strong audit requirements.',
        stakeholders: 'Claims, underwriting, compliance, legal, customer service, and platform engineering.',
        organization: 'Central controls with specialist operating teams.',
        limitations: 'Historical labels encode inconsistent handling practices.'
      },
      useCases: [
        useCase('schadenakte', 'Schadenakte zusammenfassen', 'Completed', 'dossier', {
          summary: 'Create an attributable claim-file synopsis for specialist review.',
          stationOverrides: Object.fromEntries(STATIONS.map(s => [s.id, 'complete'])),
          artifactTitle: 'Final adoption dossier',
          artifactBody: 'Demo dossier: the case met its evidence threshold and moved into a controlled operational pilot.'
        }),
        useCase('policenpruefung', 'Policenprüfung unterstützen', 'No-Go', 'decision', {
          summary: 'Assess policy clauses against a proposed underwriting change.',
          stationOverrides: { opportunity: 'complete', stakeholders: 'complete', 'business-case': 'complete', 'data-readiness': 'complete', 'solution-shape': 'complete', evidence: 'complete', decision: 'complete' },
          activity: ['No-Go concluded: insufficient reliable clause normalization', 'Earlier proceed recommendation superseded']
        }),
        useCase('compliance-auskunft', 'Interne Compliance-Auskunft', 'Phase 3', 'adoption')
      ]
    }
  ]
};

export function validatePortfolio(portfolio) {
  const errors = [];
  if (!portfolio || !Array.isArray(portfolio.customers)) return ['Portfolio has no customers.'];
  const customerIds = new Set();
  for (const customer of portfolio.customers) {
    if (!customer.id || customerIds.has(customer.id)) errors.push(`Invalid or duplicate customer: ${customer.id || 'missing ID'}`);
    customerIds.add(customer.id);
    const useCaseIds = new Set();
    for (const item of customer.useCases || []) {
      if (!item.id || useCaseIds.has(item.id)) errors.push(`Invalid or duplicate use case in ${customer.id}.`);
      useCaseIds.add(item.id);
      if (!STATIONS.some(station => station.id === item.currentStation)) errors.push(`Unknown station ${item.currentStation} in ${item.id}.`);
      for (const stationId of Object.keys(item.stations || {})) if (!STATIONS.some(station => station.id === stationId)) errors.push(`Unknown station ${stationId} in ${item.id}.`);
    }
  }
  return errors;
}
