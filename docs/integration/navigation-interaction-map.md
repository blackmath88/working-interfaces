# Navigation and interaction map

This inventory describes the Adoption Lane reference application at
`/reference/case-system-reference-app/`. Because it is a static field-manual
prototype, canonical application routes are represented after the URL hash.
That keeps routes deep-linkable and gives them native browser back/forward
behavior without introducing a router or server fallback.

## Previous inconsistencies

- Six tab-like links all used `href="#"`; none represented the displayed object.
- `showView()` replaced content without browser history, breadcrumb, title, or
  left-navigation synchronization.
- The three “domains” replaced the current case in place and lost context.
- Workspace, evidence, decision, timeline, and artifact had no explicit parent.
- Supporting evidence/history and primary work were given the same tab treatment.
- Mobile duplicated every desktop view control and did not expose hierarchy.
- There was no customer level, use-case hub, malformed-ID handling, contextual
  panel, demo-data safety boundary, or logical parent navigation.

## Canonical inventory

| Entry point | Object level | Previous treatment | Treatment | History and breadcrumb | Left navigation | Mobile |
| --- | --- | --- | --- | --- | --- | --- |
| `#/control-center` | Portfolio | Hero/demo tabs | Page | Pushes hash; `Adoption Lane` | Control Center active | Drawer navigation |
| `#/customers/:customerId` | Customer | Missing | Page | Customer crumb is current | Customer active and expanded | Same page; drawer closes after selection |
| `#/customers/:customerId/use-cases/:useCaseId` | Use case / journey | Case overview tab | Page/hub | Customer linked; use case current | Use case active | Route Engine horizontally scrolls |
| `…/stations/:stationId` | Station | Workspace/decision tab | Page | Customer and use case linked | Customer branch remains expanded | Full page, not a sheet |
| `…/stations/:stationId/artifacts/:artifactId` | Artifact | Artifact tab | Page | Station is a logical linked parent | Context remains selected | Full page |
| `?panel=customer-context` | Shared context | Missing/inline inspector | Panel | Panel identifier is added to current hash | Selection unchanged | Full-width bottom sheet |
| `?panel=station-reason` | Blocked/skipped reason | Missing | Panel | Closing returns to underlying route | Selection unchanged | Full-width bottom sheet |
| `?panel=provenance` | Provenance | Timeline tab | Panel | Deep-linkable URL state | Selection unchanged | Full-width bottom sheet |
| `?panel=revision-history` | Artifact history | Timeline tab | Panel | Deep-linkable URL state | Selection unchanged | Full-width bottom sheet |
| `?panel=use-case-metadata` | Compact metadata | Missing | Panel | Deep-linkable URL state | Selection unchanged | Full-width bottom sheet |
| Demo load/restore | Bounded replacement | Missing | Dialog | No route change before confirmation | Unchanged | Centered dialog |
| Irreversible No-Go | Decision | Immediate button | Dialog confirmation | Station remains underneath | Unchanged | Centered dialog |
| Customer expand/collapse | Navigation detail | Missing | Inline | No history entry | Branch changes only | Inline in drawer |
| Current phase expansion | Phase detail | Duplicated full list | Inline disclosure | No history entry | Unchanged | Inline disclosure |

## Interaction rules

Pages change the object of work. Panels reveal supporting context. Dialogs
confirm short bounded actions. Inline controls modify or disclose the current
object. The prototype contains no nested panels or nested dialogs and does not
put a station workflow inside an overlay.

## Back behavior

- Browser back/forward follows actual hash entries.
- Station and artifact pages also expose explicit logical-parent links.
- Opening a panel creates URL history; Escape or Close returns to the underlying
  route and restores focus to the opener when it is still mounted.
- Use-case switching returns to a station last visited during the session when
  it is safe, otherwise to the selected use-case hub.
- Customer selection always returns to that customer's overview.
- Invalid, deleted, or cross-customer IDs produce a safe not-found state.

## Remaining limitations

- Hash routes are appropriate to this static prototype but a production app
  should use server-resolved path routes with the same object hierarchy.
- Focus restoration is limited when browser navigation replaces and re-renders
  the opener; close buttons retain it during ordinary panel use.
- The demo repository is browser-local and intentionally not a production data
  or import service.

