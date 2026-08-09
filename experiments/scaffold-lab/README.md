# Scaffold Lab

This built experiment ports the preserved single-file study at
`experiments/html/scaffold-lab.html` onto `@working-interfaces/scaffold`. It is
the package's first working consumer and the token contract's second consumer.

The lab is plain TypeScript and Vite. Its composition root wires the scaffold
router to scaffold view-state and rendering; its local domain layer owns lesson
progress; its canon contains pure string builders; and its views own DOM events
and demo behaviour. There is deliberately no local `engine/` directory and no
browser storage. The only persistence mechanism offered by the UI is JSON
export.

Run it from the repository root:

```sh
npm run build:lab
npm --workspace @working-interfaces/scaffold-lab run dev
```

## Friction

The log is a record, not a to-do list. Entries closed by later work are marked
resolved and keep their original text.

### npm does not resolve the required workspace protocol — RESOLVED
Where: package.json, experiments/scaffold-lab/package.json, tsconfig.json, and vite.config.ts
What happened: npm 11.12.1 rejected `workspace:*` with `EUNSUPPORTEDPROTOCOL`; registering `experiments/*` as a root workspace therefore broke root install, so the declaration remains but the lab build uses a package source alias and a prefix script
Severity: friction
Fix would be: use a package manager that supports the workspace protocol, or standardize npm workspace dependencies on npm's supported version/file form
Resolved: the dependency is now `"@working-interfaces/scaffold": "*"`, the lab is a registered root workspace, and both the TypeScript path alias and the Vite resolve alias are gone. The build resolves the package through the workspace symlink, so the manifest and the resolver finally agree.

### The consumer must invoke an app-owned token generator
Where: package.json scripts and src/styles/lab.css
What happened: the generated stylesheet lives inside `apps/field-manual`, so the lab calls that app's internal generation script and imports its ignored output by relative path
Severity: friction
Fix would be: expose token generation and its generated CSS from a neutral package or root tool

### Token generation assumes LF frontmatter
Where: the `tokens` build step on Windows
What happened: the existing generator's frontmatter expression rejected CRLF knowledge records; narrowly scoped repository attributes now keep token sources and their generated copies on LF without changing the generator
Severity: friction
Fix would be: make the shared generator accept `\r?\n`

### The colour contract has no subtle structural border — RESOLVED
Where: src/styles/lab.css, dense logs, code panes, and nested cards
What happened: the original study distinguishes rules from faint dividers, but the contract only offers `border-structural`; the port uses that heavier role everywhere instead of inventing a local colour
Severity: cosmetic
Fix would be: prove a reusable `border.subtle` role in another consumer before adding it to the contract
Resolved: `border.subtle` is a declared contract role bound by both styles. Divisions inside a plane — log rows, list items, nested panes, a lab header against its body — use it; boundaries between planes keep `border.structural`.

### The colour contract has no text role for filled actions — RESOLVED
Where: src/styles/lab.css, primary buttons
What happened: the original uses filled primary actions but neither binding guarantees that a surface token is legible on `focus-primary`; the port keeps actions outlined instead of guessing an on-accent colour
Severity: cosmetic
Fix would be: add a paired on-accent text role only after filled semantic actions are proven across consumers
Resolved: `text.on-accent` is a declared contract role, and each style binds a value measured at 4.5:1 or better against its own `focus.primary` — 5.02:1 in Institutional Light, 4.63:1 in Signal Dark. The three primary actions the original study filled are filled again.

### Storage uses one mutable process-wide driver — RESOLVED
Where: src/views/labs.ts, journal, store, and migration demonstrations
What happened: independent memory-backed demonstrations would overwrite one another through `setDriver`, so a local `withDriver` wrapper saves and restores the active driver around each operation
Severity: friction
Fix would be: expose storage as an instance/factory, or let operations accept an explicit driver
Resolved: `setDriver`/`getDriver` are gone. `createStorage({ driver, namespace })` returns an independent instance, and the journal, store, and migration demonstrations each hold their own. The `withDriver` wrapper is deleted.

### A failed migration does not identify or checkpoint the failed step — RESOLVED
Where: src/views/labs.ts, migration demonstration
What happened: migration 1 can mutate data before migration 2 throws while the stored version remains 0; the next run invokes migration 1 again, so the demo's migration 1 must be idempotent and detect its existing result before migration 2 effectively retries
Severity: friction
Fix would be: document idempotence as a migration requirement and include the failed step in an error/report, or provide transactional/checkpoint semantics
Resolved: the version is now written after each individual migration succeeds. `migrate` returns rather than throws, and `MigrationReport` carries `applied`, `failed` (name, index, error), and the version actually reached. The demo's migrations dropped their idempotence guards because nothing runs twice. ADR 0005 records the amended invariant.

### Store instrumentation is consumer-owned
Where: src/views/labs.ts, store demonstration
What happened: the scaffold correctly exposes only `subscribe` and `notify`, so the teaching UI wraps subscriptions and notify calls to display demo-only listener and fire counts
Severity: cosmetic
Fix would be: keep this local; production subscription contracts should not gain observability solely for a teaching counter

### View-state needs local log helpers
Where: src/views/labs.ts, all demo messages
What happened: shallow `set` cleanly covers `lesson`, `log`, `demoName`, and `panelOpen`, but append-and-trim logging remains a small consumer helper
Severity: cosmetic
Fix would be: keep this local unless repeated consumers prove a common collection-update helper

### Router startup is a two-call composition
Where: src/main.ts, initial route synchronization
What happened: `onRouteChange` subscribes to future changes but does not emit the current route, so the composition root also calls `deserialize(window.location.hash)` explicitly at startup
Severity: cosmetic
Fix would be: document the initial-read pattern, or offer an opt-in immediate subscription

### Journal fields feel ceremonial in a single-user lab
Where: src/views/labs.ts, marking a lesson understood
What happened: the lab supplies a constant fallback author plus generic rationale and rejected alternative because it has no author or formal decision context
Severity: cosmetic
Fix would be: make `decided_by` optional, or keep the author resolver and accept the ceremony for a uniform record
