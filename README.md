# Working Interfaces

A fast, knowledge-first environment for prototyping and documenting serious, information-rich interfaces.

> Keep the speed of HTML. Add TypeScript only where confidence matters.

## What this first version proves

One canonical Markdown record becomes:

- a human-readable Astro page;
- a JSON resource;
- a raw Markdown download.

The existing Case Systems field manual remains available unchanged under `/legacy/`.

## Migration architecture

Astro owns routing, publishing, and the outer field-manual shell. The established
manual chapters remain HTML source documents in `apps/field-manual/public/legacy`;
Astro reads and wraps them at build time so their existing visual appearance and
interaction behavior remain intact. This is an interim routed-legacy architecture,
not a complete native Astro content migration. Raw HTML experiments remain a
first-class lane under `experiments/raw-html`, and proven structures may be
extracted selectively later. A mass rewrite is not planned.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Check and verify

```bash
npm run check:links
npm run verify
```

`check:links` validates local links and assets in the generated site. `verify`
builds the site first and then runs that check.

## Deploy to Cloudflare Workers

```bash
npm run deploy
```

Wrangler publishes only `apps/field-manual/dist`.

## Current scope

- Astro field-manual shell
- raw HTML prototype lane
- canonical Markdown/YAML knowledge
- minimal Zod validation through Astro content collections

Not yet included: React product, API, MCP, database, Lit, or a context builder.
