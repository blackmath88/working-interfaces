# ADR 0006: Navigation and interaction levels

Status: accepted for the reference prototype

## Context

The former reference app treated overview, workspace, evidence, decision,
timeline, and artifact as equivalent JavaScript tabs. The URL remained `#`,
browser history had no meaning, and replacing a sample case discarded the
user's object context.

## Decision

Adoption Lane uses this object hierarchy:

`Control Center → Customer → Use Case/Journey → Station → Artifact`

The static prototype encodes canonical paths in the hash:

```text
#/control-center
#/customers/:customerId
#/customers/:customerId/use-cases/:useCaseId
#/customers/:customerId/use-cases/:useCaseId/stations/:stationId
#/customers/:customerId/use-cases/:useCaseId/stations/:stationId/artifacts/:artifactId
```

IDs in this path are the sole source for rendered route state. Supporting
panels use `?panel=:panelId` within the hash; no navigation state is persisted
as a competing custom history.

### Interaction levels

- Full pages own primary work: portfolio, customer, journey, station, decision,
  major artifact, and dossier.
- Side panels reveal shared customer context, reasons, provenance, history, and
  compact metadata while keeping the page visible.
- Dialogs only confirm bounded destructive or irreversible actions.
- Inline controls expand navigation/phase detail and switch a local selection.

### Browser and parent navigation

Hash changes use the browser's native history. Prior breadcrumb entries and
explicit parent links return to logical parents; browser back returns to the
actual previous location. A station reached from the Route Engine links back
to the same use-case journey. Customer and use-case IDs remain present through
station and artifact navigation.

### Breadcrumbs and navigation

Breadcrumbs show human labels, never technical IDs. Every prior level is a
link and the current level is plain text. Long names retain full `title` and
accessible labels while truncating visually. Small screens collapse middle
crumbs visually. Left-navigation selection is derived from the same route.

### Panels and accessibility

The contextual panel has a labelled heading, visible close control, Escape
handling, scrim, focus transfer, and best-effort trigger focus restoration.
It becomes a full-width bottom sheet below 600 px. Primary station and artifact
work never recomposes into a panel.

## Rejected alternatives

- A large client router was rejected because this is a static HTML reference
  embedded in an Astro field manual.
- Query-only duplicated page state was rejected because it obscures hierarchy.
- Modal tabs for evidence/history were rejected because supporting context
  should preserve the work beneath it.
- A custom history stack was rejected because it competes with browser history.
- Repeating all nine stations beneath the Route Engine was rejected; the lower
  workspace shows only the current phase.

## Consequences and remaining inconsistencies

The prototype now supports deep links, browser navigation, coherent breadcrumbs,
and safe failures. Production deployment should replace hash paths with normal
server routes. Focus restoration after arbitrary browser traversal remains
subject to whether the original trigger still exists after the page re-renders.

