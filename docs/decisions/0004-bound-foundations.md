# ADR 0004 — Name patterns by purpose and bind foundation values

**Status:** Accepted for experiment

**Date:** 2026-08-08

## Context

The `knowledge/components/` name primed both people and language models to ask
for framework components. Its first record instead describes a way to
communicate provenance: purpose and behaviour come before implementation.

Colour was separately described by hardcoded shell values, sealed legacy page
values, and a semantic-token glossary with no bound values. Another prose-only
description would preserve that drift. Motion likewise had doctrine and timing
bands but no canonical values available to the shell.

## Decision

Canonical interface knowledge is named `patterns/`, which primes work toward
purpose, behaviour, and then implementation. Provenance lives beneath that
name rather than presenting itself as a component awaiting React code.

Foundation records bind typed semantic values in frontmatter. The build reads
those records and generates CSS custom properties, making the records the
source for both explanation and runtime values. Generated `tokens.css` is build
output and is never edited or committed.

No `packages/tokens` workspace is created. A hand-maintained token package
would introduce another source that can drift from the foundation records.

The existing legacy chapters are sealed design evidence. Their standalone
inline `:root` declarations remain permanently independent and are expected to
drift from the generated token system; future work must not "fix" that drift.

The knowledge schema gains an optional `implementation` pointer for HTML
studies and a future React import specifier. Nothing consumes it yet. It opens
a deliberate path from a proven record to running code without adding React or
prematurely extracting a package.

## Consequences

- One foundation edit changes its human page, JSON, Markdown download, and CSS.
- The field-manual shell aliases its old custom-property names to generated
  semantic tokens, so downstream styling does not need to change at once.
- Foundation frontmatter must contain valid token values or development and
  production builds fail with a source-specific error.
- Legacy pages and the field-manual shell intentionally follow different token
  lifecycles.
