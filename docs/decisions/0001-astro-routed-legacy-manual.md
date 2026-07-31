# ADR 0001 — Astro-routed legacy manual

## Status

Accepted as an interim architecture.

## Context

The established field manual is a set of self-contained HTML documents with
their own CSS and JavaScript. They already express the intended visual language
and interaction behavior. Rewriting them during the first Astro migration would
add risk without improving the evidence those pages provide.

The repository also needs stable routes, a publishing entry point, and a small
knowledge loop that can expose one source record as HTML, JSON, and Markdown.

## Decision

Astro owns routing, publishing, and the outer field-manual shell. Established
manual pages remain HTML source documents under `apps/field-manual/public/legacy`.
At build time, Astro reads those documents and wraps their existing head and body
content in route pages. Small route-specific link normalization happens in the
wrapper rather than through repeated edits to every legacy source.

This approach preserves visual parity and existing interaction behavior. It is
not a complete migration of the manual into native Astro content or components.

Raw HTML experimentation remains a first-class development lane under
`experiments/raw-html`. Experiments can stay as evidence, be documented, or have
only their proven parts migrated later.

## Consequences

### Positive

- Existing visual and behavioral evidence remains intact.
- Astro provides canonical routes and one deployable output.
- Relative legacy assumptions can be normalized in one integration boundary.
- New knowledge records can use native Astro content without forcing a manual rewrite.
- Fast, dependency-free experiments remain possible.

### Limitations

- Legacy pages do not yet share Astro layouts or typed content structures.
- Some navigation exists both in the Astro shell and inside wrapped documents.
- Link normalization is intentionally narrow and must be extended carefully if
  new legacy path conventions appear.
- Visual parity still depends on preserving the legacy assets and scripts.

## Future direction

Shared structures may be extracted selectively after repeated use proves their
value. A mass rewrite of the legacy manual is explicitly not planned. Future
work should prefer small migrations with visual comparison and link verification.

