---
id: scaffold
title: Application Scaffold
status: experiment
kind: pattern
revision: 1
summary: A framework-free floor for domain-driven prototypes with explicit state and rendering boundaries.
related: []
implementation: { html: "experiments/scaffold-lab", status: "experimental" }
---

## Layering

Dependencies flow in one direction:

- Domain defines the project-specific object model and knows nothing about other layers.
- Engine may import domain types and owns storage-backed mutation boundaries.
- Canon is pure: it builds strings and performs deterministic formatting without events or storage.
- Shell may import domain, engine, and canon to form the application frame.
- Views and pages mount strings and bind behaviour.

The scaffold does not provide a domain model or shell markup. Those remain local until repeated implementations prove a shared form.

The scaffold now has a working consumer in `experiments/scaffold-lab`, ported from the preserved single-file study.

## Storage is an instance

Storage is created explicitly with a driver and a namespace, and each instance is independent. There is no process-wide driver to set, so two parts of an application—or two demonstrations on one page—can hold different backing stores at the same time without saving and restoring a global.

## Checkpointed migrations

Migrations are numbered functions run in order, and the schema version is written after *each* one succeeds, not once after the whole run. A migration that throws stops the run at a known version: the steps before it are recorded as done, the failing step is named in the report, and the next run resumes at that step. No migration runs twice, so migrations do not have to be idempotent.

## Domain state and view state

Domain state records facts. It is persisted, migrated, and—when a decision changes—journaled. Every project owns its domain store and routes writes through that boundary.

View state describes how someone is currently looking at those facts: camera position, focus, selection, open panels, and active filters. It is ephemeral, never migrated, and never journaled. A project may serialize useful view state through the hash router when it needs deep links and browser history.

## Append-only decisions

Journal entries are immutable and append-only. Superseding a decision appends a new entry whose `supersedes` field references the earlier entry. The earlier entry is never rewritten or removed.
