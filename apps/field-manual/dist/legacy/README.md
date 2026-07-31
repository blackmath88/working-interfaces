# Case Systems UI Field Manual

A deployable static field manual and LLM-grounding repository for designing case-based applications.

## Open locally

Open `index.html` directly in a browser, or run any static server in the repository root.

Examples:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch containing the files and the `/ (root)` folder.
5. Save.

The site has no build step.

## Cloudflare Pages

1. Create a Pages project connected to the repository.
2. Framework preset: **None**.
3. Build command: leave empty.
4. Build output directory: `/`.
5. Deploy.

## LLM grounding

Start with:

- `grounding/agent-instructions.md`
- `grounding/system-overview.md`
- `grounding/system-model.json`

Then add the focused files and relevant HTML chapters for the task.

For Adoption Lane, also include:

- `adoption-lane/method-laws.md`
- `adoption-lane/visual-doctrine.md`
- `adoption-lane/agent-extension.md`

## Structure

- `index.html` — public visual entry point
- `manual/` — interactive visual chapters
- `reference/` — integrated reference application
- `grounding/` — concise LLM sources of truth
- `adoption-lane/` — strict vertical extension

## Status

This is an exploratory design intelligence package and reference system, not a production component package.
