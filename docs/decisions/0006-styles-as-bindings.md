# ADR 0006 — Treat styles as foundation bindings

**Status:** Accepted for experiment

**Date:** 2026-08-09

## Context

The first foundation records combined semantic contracts with one concrete set
of values. That proved records could generate runtime CSS, but it could not
prove the central claim that stable names support different product identities.
A second binding would collide with the first inside the same contract.

## Decision

Foundations declare token names, meanings, advisory ranges, and usage rules.
Styles bind every declared name to a concrete value. Separating contract from
binding makes visual variety cheap while keeping consistency effectively free:
consumers use one vocabulary and products choose an identity.

Completeness is enforced during the build. Every style must bind every
foundation token, may not introduce undeclared tokens, and must have a unique
selector. A missing or unknown role fails loudly rather than producing partial
CSS. At least one `:root` binding is mandatory.

A style is a product identity, not a `prefers-color-scheme` preference.
`signal-dark` is selected explicitly and persisted; it is never inferred from
the operating system. Treating styles as OS theming would erase the distinction
between product identity and user preference.

Institutional Light preserves the existing field-manual binding. Signal Dark is
extracted from Shipyard rather than invented, so both bindings come from work
that shipped.

Density and typography are not yet part of a style. They belong there
eventually, but colour and motion are sufficient to prove that the contract and
its values can move independently.

## Consequences

- Changing a style record regenerates the entire matching CSS block without a
  markup or contract edit.
- Changing the contract requires every style to bind the new role before the
  build can pass.
- Advisory motion ranges can be intentionally exceeded by an identity; value
  syntax is validated, but stylistic judgment remains with the style record.
- Product identity can switch at runtime without coupling it to OS appearance.
