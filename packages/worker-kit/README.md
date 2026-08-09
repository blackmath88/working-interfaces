# @working-interfaces/worker-kit

Server-side pieces of a password-gated, D1-backed Cloudflare Worker. Extracted
from a deployed project rather than designed here.

This package is separate from `@working-interfaces/scaffold` because of where
its code runs. The scaffold has no dependencies and runs in a browser;
worker-kit needs `@cloudflare/workers-types` and runs on the server. Merging
them would put Cloudflare's global type declarations into every browser
project that imports a formatter.

No runtime dependencies. `@cloudflare/workers-types` is a dev dependency.

## auth — one shared password

One secret, no accounts. The cookie is a salted SHA-256 of the password, so it
is derived rather than stored: rotating the secret invalidates every session at
once, with no session table to keep.

What it does not give you: identity. Nobody is named, so there is no per-person
audit trail, no way to revoke one seat, and no recovery except changing the
secret for everyone. Right for a small team sharing one instrument; wrong the
moment somebody has to know who changed what.

The login page is a caller-supplied function. The default is deliberately
unstyled — a gate that arrives with someone else's visual language is a gate
every project has to undo first.

```ts
import { createPasswordGate } from '@working-interfaces/worker-kit';

const gate = createPasswordGate({
  password: env.GATE_PASSWORD,
  renderLogin: ({ failed, loginPath }) => myLoginPage(failed, loginPath),
});

const authRoute = await gate.handleAuthRoutes(request);
if (authRoute) return authRoute;

const authenticated = await gate.isAuthenticated(request);
if (url.pathname.startsWith('/api/')) {
  if (!authenticated) return error('Unauthorized', 401);
  return handleApi(request, env);
}
if (authenticated) return env.ASSETS.fetch(request);
return gate.loginResponse();
```

**The application's own HTML is served only through the asset binding, only
after the check passes.** Never inline it in the worker: an inlined page is a
page that can ship without the gate in front of it. worker-kit deliberately
does not touch `env`, so this last step stays visible in the project.

`crypto.subtle.timingSafeEqual` is a Workers extension, not standard WebCrypto.
It is used when present and falls back to a constant-time comparison of the two
digests elsewhere, so the same code runs under `node --test`.

## http — reading requests, shaping responses

`readJsonBody` caps the body twice: against `content-length`, which is cheap
and rejects an honest large upload before any work, and again while reading,
because `content-length` is a claim rather than a fact.

`json` never caches. `RequestError` carries a status and is safe to show;
`errorResponse` turns anything else into a logged, generic 500 so an exception
message cannot leak into a response body.

## d1 — two write patterns

**Mark and sweep.** Blank the timestamp on every row, upsert the full current
set with a real timestamp, delete whatever still carries the blank. One
`db.batch()` replaces the whole state without diffing, and deletions fall out
for free rather than having to be detected.

```ts
await runReplace(env.DB, [
  { table: 'cases', rows: cases.map(caseValues) },
  { table: 'steps', rows: steps.map(stepValues) },
], new Date().toISOString(), [upsertMeta(env.DB, 'updated_at', stamp)]);
```

**Variable-limit chunking.** D1 caps bound variables per statement, so a
multi-row insert splits by column count, not row count:
`floor(100 / columns)`. Forgetting this produces a failure that only appears
once the data grows.

Table and column names are parameters; schemas belong to projects. Each entity
table needs a text primary key, a timestamp column to mark with (default
`updated_at`), and optionally an integer counter (default `version`) that the
upsert increments. `meta` is a plain key/value table. Identifiers are validated
before interpolation, since they cannot be bound.

Nothing about a *schema* was extracted. The source project's eight tables, its
tree flattening, and its row mappers are its own domain and stayed there.
