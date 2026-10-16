<!-- BEGIN public-repo-header -->
<div align="center">

# Working Interfaces

<a href="https://github.com/blackmath88/working-interfaces"><img alt="Primary language: HTML" src="https://img.shields.io/badge/language-HTML-526078?style=flat"></a>
<a href="https://github.com/blackmath88/working-interfaces/tree/main/docs"><img alt="Documentation" src="https://img.shields.io/badge/docs-guide-16796f?style=flat"></a>
<a href="https://github.com/blackmath88/working-interfaces/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/blackmath88/working-interfaces?style=flat&amp;color=737373"></a>

</div>
<!-- END public-repo-header -->

A fast, knowledge-first environment for prototyping and documenting serious, information-rich interfaces.

> Keep the speed of HTML. Add TypeScript only where confidence matters.

## What this first version proves

One canonical Markdown record becomes:

- a human-readable Astro page;
- a JSON resource;
- a raw Markdown download;
- for foundations, generated CSS custom properties.

The existing Case Systems field manual remains available unchanged under `/legacy/`.

## Migration architecture

Astro owns routing, publishing, and the outer field-manual shell. The established
manual chapters remain HTML source documents in `apps/field-manual/public/legacy`;
Astro reads and wraps them at build time so their existing visual appearance and
interaction behavior remain intact. This is an interim routed-legacy architecture,
not a complete native Astro content migration. HTML experiments remain a
first-class lane under `experiments/html`, and proven structures may be
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
- HTML prototype lane
- canonical Markdown/YAML knowledge
- minimal Zod validation through Astro content collections

Not yet included: React product, API, MCP, database, Lit, or a context builder.
