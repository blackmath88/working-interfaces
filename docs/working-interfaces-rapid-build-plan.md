# Working Interfaces — Rapid Build Plan

**Status:** Work in progress  
**Purpose:** Keep the project fast, visible, and sound without overbuilding the long-term architecture.  
**Guiding motto:** **Prototype brutally. Formalize selectively. Extract only after proof.**

---

## Core principle

This is a large vision, but we should not build the whole vision at once.

We will build a sequence of small proofs:

```text
idea
→ visible prototype
→ useful evidence
→ selective formalization
→ reusable architecture only when justified
```

Every milestone should answer:

- Can we see it?
- Can we use it?
- Did it teach us something?

When the answer is no, the milestone is too architectural.

---

# Milestone 0 — Create the clean repository

**Timebox:** 30–60 minutes

Create:

```text
blackmath88/working-interfaces
```

Initial structure:

```text
working-interfaces/
├── apps/
│   └── field-manual/
├── experiments/
│   └── html/
├── knowledge/
├── docs/
│   └── decisions/
├── package.json
├── wrangler.json
└── README.md
```

Do not create yet:

- React platform app
- separate API app
- knowledge Worker
- MCP server
- Lit package
- database setup
- speculative package structure

### Done means

- The repository exists.
- The current manual is imported.
- The site deploys from the new repository.
- Cloudflare Access still protects it.

---

# Milestone 1 — Preserve the prototype superpower

**Timebox:** Half a day

Move the current visual studies into:

```text
experiments/html/
```

These remain:

- plain HTML
- plain CSS
- plain JavaScript
- directly inspectable
- free from TypeScript requirements
- free from package architecture
- free from test requirements

Add a simple experiment index with:

- title
- status
- short description
- link to open the prototype

Suggested statuses:

```text
rough
promising
reference
graduated
discarded
```

### Done means

You can still create a completely different interface in one HTML file and see it live immediately.

This lane stays permanently available.

---

# Milestone 2 — Add an Astro shell, not a migration

**Timebox:** Half a day

Create a minimal Astro site in:

```text
apps/field-manual/
```

Only migrate:

- homepage
- shared navigation
- experiment index
- one documentation layout

Do not rewrite the existing visual studies.

Astro should link to or embed the raw HTML experiments.

### Done means

- Shared navigation is generated.
- The field manual has a coherent shell.
- Raw HTML studies remain unchanged.
- The output is still ordinary inspectable HTML.

---

# Milestone 3 — Prove one source feeding multiple surfaces

**Timebox:** Half a day

Create one canonical knowledge record:

```text
knowledge/patterns/provenance/provenance-value.md
```

Example frontmatter:

```yaml
---
id: provenance-value
title: Provenance Value
status: experiment
kind: component
revision: 1
---
```

That one file should produce:

1. a human-readable Astro page;
2. a JSON representation;
3. a raw Markdown download.

### Done means

One canonical record successfully feeds both human and machine surfaces.

This is the central architecture proof.

---

# Milestone 4 — Add only enough validation

**Timebox:** 1–2 hours

Create a small Zod schema for the canonical record frontmatter.

Validate only:

```text
id
title
status
kind
revision
```

Do not design the final universal schema.

### Done means

- Invalid records fail clearly.
- TypeScript provides useful guardrails.
- Validation does not slow down authoring.

---

# Milestone 5 — Capture Adoption Lane as a recipe overlay

**Timebox:** 1–2 hours

Create:

```text
knowledge/recipes/adoption-lane.yaml
```

Represent:

- vocabulary changes;
- fixed station order;
- visible route;
- visible skipped stations;
- No-Go as a first-class outcome;
- provenance requirements;
- required reflection fields;
- visual defaults.

Possible shape:

```yaml
id: adoption-lane
extends: working-interfaces-core

vocabulary:
  stage: station
  process: lane

requiredModules:
  - visible-route
  - decision-journal
  - organizational-reflection

constraints:
  stageOrder: fixed
  skippedStagesRemainVisible: true
  noGoIsFirstClassOutcome: true
  provenanceDisplay: required

visualDefaults:
  composition: route-first
  density: compact
  routeStyle: transit-instrument
```

Do not build a recipe engine yet.

### Done means

The distinction between Working Interfaces and Adoption Lane is machine-readable rather than only documented in prose.

---

# Milestone 6 — Add a second related record

**Timebox:** 1–2 hours

Create:

```text
knowledge/patterns/stage-workspace.md
```

Connect it to:

```text
provenance-value
```

### Done means

- The field manual can show related records.
- Relationships are understandable.
- We learn whether a registry is actually needed.

Do not create a separate registry package until plain file loading becomes insufficient.

---

# Release 0.1 — Knowledge Loop

Stop and assess after Milestone 6.

The first release should contain only:

```text
Raw HTML experiments
Astro field-manual shell
Markdown and YAML knowledge records
Basic Zod validation
Human page output
JSON output
Raw Markdown download
Adoption Lane recipe overlay
```

Explicitly excluded:

- MCP
- HTTP API
- database
- Lit
- React product shell
- context-builder package
- large package architecture

---

# Milestone 7 — Build one real product workflow

Start only after Release 0.1.

Create:

```text
apps/platform/
```

Use:

```text
React
TypeScript
Vite
```

Build one narrow workflow:

```text
Case
→ Evidence
→ Decision
→ Provenance
```

Use mock data first.

Do not build:

- login
- billing
- settings
- user administration
- generic dashboard
- generic SaaS shell

Organize the product by domain:

```text
src/
├── features/
│   ├── cases/
│   ├── evidence/
│   ├── decisions/
│   └── provenance/
├── routes/
├── app/
└── shared/
```

Inside a feature:

```text
evidence/
├── components/
├── model/
├── api/
├── queries/
├── routes/
└── tests/
```

### Done means

One serious workflow works and visibly benefits from the design and knowledge system.

---

# Milestone 8 — Build one manual context pack

Before creating an API or MCP service, generate one downloadable bundle:

```text
working-interfaces-context/
├── manifest.json
├── doctrine.md
├── provenance-value.md
├── stage-workspace.md
├── adoption-lane.yaml
└── schema.json
```

Target task:

> Build a provenance-aware decision workspace using the Adoption Lane recipe.

Give the bundle to an LLM and compare the result with an ungrounded prompt.

### Done means

The context bundle produces materially better output.

This validates the future Context Builder manually.

---

# Milestone 9 — Automate only proven repetition

Only after the manual process becomes repetitive:

- add a small knowledge registry;
- automate context-pack generation;
- expose a read-only HTTP API;
- add MCP when a real client needs it;
- extract Lit only when one component genuinely needs two host frameworks;
- choose a database only after real access patterns are visible.

Automation follows pain. It does not precede it.

---

# Permanent development lanes

## Lane A — Fast visual experimentation

```text
experiments/html/
```

Use for:

- visual direction;
- layouts;
- interaction sketches;
- radical redesigns;
- one-shot prototypes;
- ideas that may be discarded.

Rules:

- HTML, CSS, and JavaScript are enough.
- No TypeScript requirement.
- No reusable API requirement.
- No tests required.
- A prototype may remain visual evidence forever.

## Lane B — Durable product implementation

Use when an idea has proven valuable.

Flow:

```text
validated idea
→ domain model
→ React implementation
→ real data
→ persistence
→ accessibility
→ tests
→ possible reusable extraction
```

TypeScript is added where durability matters.

---

# Architecture boundaries

For phase one:

```text
apps/
├── field-manual/
└── platform/          # later

knowledge/
├── components/
├── patterns/
├── recipes/
└── doctrine/

packages/
├── schemas/
├── tokens/
└── core/              # only when needed

experiments/
└── html/
```

Boundary rule:

> Knowledge and schemas may be consumed by applications, but they must never import from applications.

Keep one repository for now.

Extract knowledge into a separate repository only when there are:

- multiple external consumers;
- an independent release lifecycle;
- independent ownership;
- demonstrated reuse outside this repository.

---

# Deferred decisions

Do not decide these yet:

## Lit

Deferred until one real component must work in at least two frameworks.

## Database

Deferred until the real product reveals:

- query patterns;
- provenance complexity;
- append-only history needs;
- relationship depth;
- operational requirements.

Possible future options remain open:

- PostgreSQL
- Cloudflare D1
- another relational store

The domain model must stay storage-independent.

## MCP

MCP is a future delivery adapter, not the platform goal.

The durable core is:

```text
Canonical Knowledge
→ useful relationships
→ context selection
→ context bundles
```

Possible adapters later:

```text
Astro pages
Markdown downloads
JSON
HTTP API
MCP
future protocols
```

---

# Three proofs that matter

## Proof 1 — Authoring loop

```text
Markdown record
→ Zod validation
→ Astro page
→ JSON
→ raw Markdown download
```

## Proof 2 — Product grammar

```text
Case
→ Evidence
→ Decision
→ Provenance
```

implemented in React with a real workflow.

## Proof 3 — Context bundle

A focused knowledge package improves an LLM-generated implementation.

---

# Immediate working sequence

```text
1. Create working-interfaces repository
2. Import current field manual
3. Preserve raw HTML experiments
4. Add minimal Astro shell
5. Create provenance-value.md
6. Validate it with Zod
7. Render HTML + JSON + Markdown
8. Add Adoption Lane recipe overlay
9. Deploy
10. Stop and assess
```

---

# Project mantra

> **Keep the speed of HTML. Add TypeScript only where confidence matters.**

> **Prototype brutally. Formalize selectively. Extract only after proof.**
