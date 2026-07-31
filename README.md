# Working Interfaces

A fast, knowledge-first environment for prototyping and documenting serious, information-rich interfaces.

> Keep the speed of HTML. Add TypeScript only where confidence matters.

## What this first version proves

One canonical Markdown record becomes:

- a human-readable Astro page;
- a JSON resource;
- a raw Markdown download.

The existing Case Systems field manual remains available unchanged under `/legacy/`.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

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
