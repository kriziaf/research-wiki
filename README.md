# Research Wiki

Civic tech research portal — MVP1. Static client-side app (`index.html` + `research.css` + `research.js`) over a real knowledge base built from an Obsidian vault.

**Scope right now: Search, Retrieve, View Article only.** Ingest is explicitly deferred — see [`PHASE1_PLAN.md`](./PHASE1_PLAN.md).

Split out of `Marketing-RAG-Dashboard` on 2026-10-10 into its own repo so the research-wiki work no longer overrides that repo's canonical marketing-dashboard prototype.

## Data

`data/wiki-index.js` is a one-off manual snapshot (89 documents: concepts/entities/projects) of the user's Obsidian vault, produced by `scripts/snapshot-wiki.mjs`. Not live — rerun the script by hand when the vault changes:

```
node scripts/snapshot-wiki.mjs
```

## Planning docs

- [`PHASE1_PLAN.md`](./PHASE1_PLAN.md) — flowchart, scope decisions, open questions, MVP1 status.
- [`WIKI_INGEST_SPEC.md`](./WIKI_INGEST_SPEC.md) — zone model, frontmatter contract, and ingest/query workflow this portal should replicate for a future Ingest pass.
- [`DESIGN_STYLE_GUIDE.md`](./DESIGN_STYLE_GUIDE.md) — approved color/type/component direction. See [`design-system-demo.html`](./design-system-demo.html) for the original interactive mockup (the real app now lives in `index.html`/`research.js`).

## Running locally

Static files, no build step. Serve the directory with any static file server, e.g.:

```
python3 -m http.server 8743
```

then open `http://localhost:8743/index.html`.
