---
name: wiki-ingest
description: Finds a candidate article in the user's configured local source folders (e.g. an Obsidian "Clippings" inbox and a backup folder), then ingests it into their wiki vault — copying the raw source into the vault's raw/clippings/ zone and writing or updating frontmattered concept/entity/project pages in wiki/, following the zone model and governance rules in spec/WIKI_INGEST_SPEC.md. Always presents a plan and waits for explicit approval before writing anything. Use when the user says "ingest this," "add this to the wiki," "run wiki-ingest," or asks to bring a clipping/article into the research wiki vault.
---

# Wiki Ingest

Ingests one article at a time from the user's own vault into their wiki, following the zone model and frontmatter contract documented in `spec/WIKI_INGEST_SPEC.md`. This skill never hardcodes a path — every filesystem location comes from the user's local config (step 1), so this skill works for anyone who clones this repo and points it at their own vault.

**This is not the in-app Ingest UI.** The deployed Research Wiki app (`index.html`/`research.js`) has no Ingest flow yet (see `spec/PHASE2_PLAN.md`) — this skill operates directly on the local filesystem, outside the app, the same way the user's own `wiki-ingest` command does on their personal setup.

## Step 1 — Load or create the local config

Read `.claude/wiki-ingest.local.json` (repo root). It looks like:

```json
{
  "vaultRoot": "/absolute/path/to/your/obsidian/wiki-site",
  "sourceFolders": [
    "/absolute/path/to/your/clippings/folder",
    "/absolute/path/to/another/source/folder"
  ]
}
```

- `vaultRoot` must contain `raw/clippings/`, `wiki/concepts/`, `wiki/entities/`, `wiki/projects/` (create these if the vault doesn't have them yet and the user confirms that's intentional).
- `sourceFolders` is searched recursively for candidate `.md` files.

If this file doesn't exist, ask the user for both paths, then write the file (it's gitignored — confirm with `git check-ignore .claude/wiki-ingest.local.json` if unsure — so it never gets committed).

## Step 2 — Search

Given a title or fragment from the user, search every `sourceFolders` entry recursively (case-insensitive) for matching `.md` filenames. Also check `vaultRoot/wiki/{concepts,entities,projects}/*.md` titles (frontmatter `title:` field, or filename) for an existing match — if found, say so; the user may still want to append new source material to it (see Step 5) rather than treating it as net-new.

## Step 3 — Disambiguate

If more than one candidate file matches, list them with size and modified date (a short table is enough) and ask the user which one to use. Don't guess.

## Step 4 — Analyze

Read the chosen file. Identify 3–7 candidate concepts and 1–3 candidate entities worth their own wiki page (per the spec: "check existing `wiki/concepts/` and `wiki/entities/` for matches before creating duplicates"). For each candidate, check whether a same-titled page already exists under `wiki/concepts/` or `wiki/entities/` — if so, it's an **append**, not a new page.

## Step 5 — Present the plan, then stop

Before writing anything, list exactly what will happen:
- The raw copy: `vaultRoot/raw/clippings/<today's date, YYYY-MM-DD>-<kebab-case-slug-of-title>.md` (new file; never overwrites an existing raw file — if the slug already exists, say so and ask how to proceed instead of silently renaming).
- Each wiki page: `vaultRoot/wiki/<zone>/<Title>.md` — marked **new** (full frontmatter: `title`, `type`, `tags`, `sources: ["[[raw-slug]]"]`, `created`, `updated` both set to today) or **append** (existing file gets the new `[[raw-slug]]` added to its `sources:` list, `updated:` bumped to today, and any genuinely new nuance folded into the body — never a wholesale rewrite of existing content).

End your turn here. Do not call Write/Edit until the user's next message approves the plan. If they want changes (different tags, skip an entity, rename a page), revise the plan and present it again rather than writing a partial version.

## Step 6 — Write (only after approval)

Execute exactly the plan as approved (or as revised in the follow-up). After writing, report every file touched with its final path, and which were new vs. appended.

## Step 7 — Guardrails

- Never delete anything.
- Never silently overwrite an existing wiki page — append/merge only, per the spec's governance rules.
- If ambiguous whether something is a concept, entity, or project, ask rather than guess.
- A single ingest naturally stays small (one raw file + a handful of wiki pages) — the plan in Step 5 already covers the ">5 documents" bulk-operation warning from the spec; no separate gate is needed on top of it.

## Step 8 — Out of scope (v1)

URL ingestion (the spec's `defuddle` reference) isn't implemented here — this skill only handles files already sitting in a configured `sourceFolders` entry, matching what's actually been used so far.

## Step 9 — Offer to refresh the deployed app's corpus

If this repo has `scripts/snapshot-wiki.mjs`, after a successful write, offer (don't auto-run) `node scripts/snapshot-wiki.mjs` so the newly ingested page becomes searchable in the deployed Research Wiki app's `data/wiki-index.js`. That script also reads `vaultRoot` from the same `.claude/wiki-ingest.local.json`, so no path duplication.
