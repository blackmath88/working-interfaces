# Case Systems UI Field Manual

Case Systems is a design and implementation grammar for applications whose central object is a **case**: a bounded piece of work that moves through stages, accumulates information and evidence, receives decisions, and preserves why it changed.

Typical domains include consulting engagements, project work, organizational change, adoption programs, assessments, governance reviews, investigations, and transformation initiatives.

## Repository use

Use the repository in four layers:

1. `grounding/agent-instructions.md` — first source for coding agents.
2. Focused Markdown and JSON grounding files — concise sources of truth.
3. `manual/` — interactive visual demonstrations.
4. `reference/` — a cohesive example application.

## Stable case grammar

A case normally includes:

- identity, title, owner, domain, and lifecycle state;
- a visible route or stage structure;
- current question, work, and next decision;
- facts, assumptions, estimates, and authored judgments;
- evidence connected to claims;
- stakeholders, risks, and decision ownership;
- values carried between stages with provenance;
- append-only decision and change history;
- readable output artifacts.

## Core and extension

**Case Systems Core** is adaptable across domains.

**Adoption Lane** is a stricter extension that adds fixed method laws, a persistent route, gates, track semantics, organizational reflection, stronger geometry constraints, and append-only correction rules.

Do not apply every Adoption Lane constraint to every Case Systems product.
