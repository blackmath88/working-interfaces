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
not per source project: Adoption Lane's numbered migration storage wins over
Relationshipmap's transform-on-read approach, while Relationshipmap's
subscription contract fills Adoption Lane's missing reactivity boundary.

Storage is an instance, not a module. `createStorage({ driver, namespace })`
returns an independent handle; there is no process-wide driver to set. A
mutable module-level driver is a singleton disguised as a parameter, and any
consumer needing two backing stores at once has to save and restore it.

**Amended after ADR 0007.** The original migration rule wrote the schema
version once, after every migration succeeded, and was described as fail-safe.
It was not. A failure left the earlier migrations' data writes in place while
the version stayed at 0, so the next run re-entered at migration 1. The real
guarantee was therefore "every migration must be idempotent" — never stated,
never enforced, and true in the original Adoption Lane migration by luck.

Each migration is now checkpointed on success: the version is written after
each individual step. A failure stops the run at a known version, the report
names the step that failed and the version actually reached, and the next run
resumes at that step. No migration runs twice, so idempotence is no longer
load-bearing.

This was found by porting the lab onto the package, not by the tests. The
tests asserted the invariant as written — a failed run leaves the version
untouched — which was true and beside the point. Only a second consumer that
had to *demonstrate* a failed migration made the gap between the stated
guarantee and the actual one visible.

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
- A partly-applied migration run is a normal, recoverable state rather than an
  impossible one. Callers read `MigrationReport.failed` instead of catching;
  ignoring the report is the way to miss a failure.
- Journal operations take an explicit storage instance, because there is no
  ambient one to reach for.
- Whole-view notification remains the reactivity model; batching, selectors,
  and memoization require separate evidence and a later decision.
- Application shells and framework adapters remain project-owned.
