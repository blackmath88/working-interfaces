# ADR 0008 — Extract remote state and the worker shell

**Status:** Accepted for experiment

**Date:** 2026-08-09

## Context

The scaffold could persist to memory or `localStorage` and nowhere else. The
next project needs state shared between people, which means a server.

That capability already exists and is deployed: Relationshipmap runs on
Cloudflare with D1 behind a password gate. This is the third extraction of the
same kind — after the scaffold itself and the foundation bindings — and the
house rule is unchanged: extract only after proof, and copy the proven thing
rather than redesign it while moving.

The write path in particular is not obvious code. Debounce, coalescing,
single-flight, re-arm, and one retry each exist because a specific failure
happened without them, and a rewrite from the description loses them silently:
everything still appears to work until the connection is slow.

## Decision

Extract in two packages, split by runtime.

`@working-interfaces/scaffold` gains `StorageBackend`, `LocalStorageBackend`,
and `RemoteStorageBackend`. `@working-interfaces/worker-kit` is new and holds
the password gate, JSON request and response handling, and two D1 write
patterns. The split is forced rather than tidy: the scaffold's guarantee is
zero dependencies in a browser, and worker-kit needs Cloudflare's global type
declarations. One package cannot hold both without pushing worker types into
every browser project that imports a formatter.

**The D1 schema was deliberately not extracted.** The source's eight normalized
tables, tree flattening, typed row mappers, and per-field validators are
Relationshipmap's domain and stayed there. Two things inside that file are
genuinely general and came across: mark-and-sweep replacement, and chunking a
multi-row insert by column count because D1's variable limit is per statement.
`isTableEmpty`, the meta key/value table, and the version counter came with
them. Everything is parameterised by table and column name; nothing knows what
is stored.

The extraction is faithful except where the source was tied to its own project.
Endpoints are options rather than the hardcoded `/api/state`. State is generic
rather than Relationshipmap's `Store`. Messages are English defaults or
options — the source's user-facing strings are German, and the scaffold is
language-neutral. The login page is a caller-supplied render function: the
original is German and draws a floating card with a two-layer shadow, which
contradicts this repository's own doctrine, so shipping it would have meant
every consumer undoing it first.

Two additions were necessary rather than chosen. `fetch` is injectable, because
the behaviours worth testing are all timing behaviours and mutating a global to
observe them is exactly the ambient-state pattern ADR 0005 removed. And
`crypto.subtle.timingSafeEqual` is a Workers extension, not standard WebCrypto,
so it is used when present with a constant-time comparison of the same two
digests as a fallback — otherwise none of the auth behaviour could be tested
outside a deployed worker.

## The unresolved part

The scaffold now holds two storage models that do not compose.

`createStorage` is a namespaced key-value store with numbered, checkpointed
migrations: many keys, upgraded in place. `StorageBackend` moves one whole
state value: one blob, no migrations, replaced entirely on every write. They
come from different projects and answer different questions.

`LocalStorageBackend` bridges them by parking the blob under a single key of a
`KeyValueStorage`, and the bridge is narrow enough to be worth naming. The
migration runner cannot see inside the blob, so a backend has no migration
story at all; the source project handles shape changes by normalizing on read
instead, which is the transform-on-read approach ADR 0005 explicitly rejected
in favour of numbered migrations. Both are now present in one package, each
correct for its own model.

This is recorded rather than resolved. Unifying them now would mean designing
against one real consumer of the backend contract and one real consumer of the
key-value store, which is the guessing the house rule exists to prevent. The
next project will use one of the two models; if it needs both at once, that is
the evidence for deciding, and this ADR gets superseded.

The API surface for many independent records — the `/api/cases` shape the next
project will probably want — was not built. It does not exist yet in any
deployed project, so there is nothing to extract.

## Consequences

- A project can start against memory or `localStorage` and move to a server by
  changing one constructor.
- The scaffold's zero-dependency browser guarantee survives; server code lives
  where server types are already assumed.
- Whole-state replacement means every save rewrites every row, and concurrent
  editing is last-writer-wins. The version counter records a collision rather
  than preventing one. Neither is fixed here.
- The shared-password gate has no identity, so no audit trail and no per-person
  revocation. Stated in the pattern rather than hidden.
- The two storage models coexist unresolved, and the scaffold is harder to
  explain until one of them wins.
