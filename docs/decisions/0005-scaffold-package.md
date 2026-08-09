# ADR 0005 — Extract the scaffold package

**Status:** Accepted for experiment

**Date:** 2026-08-08

## Context

Adoption Lane and Relationshipmap independently rebuilt the same application
layers: a domain model, storage-backed mutation engine, pure derivations, pure
string rendering, an application shell, and views that mount and bind. Their
agreement is sufficient proof to extract the common floor.

## Decision

Create the framework-free `@working-interfaces/scaffold` package with no
runtime dependencies or domain vocabulary. Decisions are made per primitive,
not per source project: Adoption Lane's numbered, fail-safe migration storage
wins over Relationshipmap's transform-on-read approach, while
Relationshipmap's subscription contract fills Adoption Lane's missing
reactivity boundary.

The decision journal is generalized because append-only supersession is
doctrine, not a fact of one domain. A superseding decision appends a reference
to its predecessor and never rewrites history.

Domain state and view state are separate. Domain state is persisted, migrated,
and journaled by project stores. View state is ephemeral and unjournaled; the
hash router can serialize it when browser history or a deep link is useful.

No framework binding is provided because four of the six proven projects are
not React applications. No shell primitives are extracted yet: side panels,
toasts, search boxes, navigation rails, action menus, settings panels, and
chrome remain entangled with project markup and must wait for a second real
consumer.

## Consequences

- Projects share small storage, journal, view-state, routing, formatting, and
  geometry contracts while retaining their domain language.
- Whole-view notification remains the reactivity model; batching, selectors,
  and memoization require separate evidence and a later decision.
- Application shells and framework adapters remain project-owned.
