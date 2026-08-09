# ADR 0007 — Port the Scaffold Lab onto the scaffold package

**Status:** Accepted for experiment

**Date:** 2026-08-09

## Context

The scaffold package and foundation bindings were internally tested but had no
independent consumer. The single-file Scaffold Lab taught the intended layers,
but duplicated miniature router, view-state, store, journal, and formatting
implementations inline. That made it a useful study, not proof that the shared
package or token contract worked for a second product shape.

## Decision

The experiments lane now admits two shapes: single-file HTML studies and built
projects. `experiments/html/scaffold-lab.html` remains unchanged as the original
study, while `experiments/scaffold-lab` is a plain TypeScript and Vite port.

The built lab is the first consumer of both `packages/scaffold` and the colour
and motion token contract. It imports router, view-state, store, journal,
storage, and formatting primitives from the package and defines no local engine
directory. It uses only a memory driver and exports JSON instead of adopting
browser persistence.

Lessons carry a `register` field. Existing module-teaching lessons use the
`module` register; one `decision` lesson, “When you need a store,” proves that a
transferable architectural judgment fits the same content shape without a
restructure. No further decision lessons are added yet.

The port's friction log is the deliverable. Awkward APIs, package resolution,
generator ownership, and missing token roles are wrapped or accommodated in the
consumer and recorded in its README. The scaffold and token contract are
deliberately not fixed during this port.

## Consequences

- The scaffold now has a working, interactive consumer outside its own tests.
- The original study remains available beside the built port for comparison.
- Built experiments require an explicit toolchain and may expose repository
  workspace or generation assumptions that single files do not.
- Future scaffold or token changes can be judged against two consumers.
- Friction is preserved as evidence for later selective extraction rather than
  converted immediately into shared API surface.
