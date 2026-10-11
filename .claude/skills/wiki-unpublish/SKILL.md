---
name: wiki-unpublish
description: Removes one or more wiki pages (concepts, entities, projects, or full-articles) from publication by moving them from their zone (wiki/concepts/, wiki/entities/, wiki/projects/, wiki/articles/) into a flat wiki/unpublish/ holding folder, which the export script never scans — so the page disappears from the deployed app without being deleted. Selects targets by tag (batch) or by explicit title(s), traces every other page that still links to a target so nothing breaks silently, and always presents a plan before touching anything. Use when the user says "unpublish this," "remove this from the wiki/app," "take this concept down," or asks to batch-remove everything tagged with something.
---

# Wiki Unpublish

Moves pages out of publication, reversibly. This is the mirror image of `wiki-ingest`: that skill only ever adds or appends; this one only ever moves pages to a holding folder the export script ignores. **Never deletes anything** — same governance rule as `wiki-ingest`, and the reason this exists as a move rather than a destructive operation.

This is a fully separate skill from `wiki-ingest` — nothing here is added to that skill's `SKILL.md`.

## Step 1 — Load the local config

Same config as `wiki-ingest`: read `.claude/wiki-ingest.local.json` (repo root) for `vaultRoot`. If it doesn't exist, point the user at `wiki-ingest`'s Step 1 instead of recreating it here — both skills share one config.

## Step 2 — Select targets (two entry modes)

- **By tag(s)**: search every page's frontmatter `tags:` list across `vaultRoot/wiki/{concepts,entities,projects,articles}/*.md` (`grep -rl` on the tag string is enough as a first pass; confirm real matches by reading each candidate's frontmatter, since a substring match isn't the same as a tag match). Use this when the user doesn't already know every file that qualifies — e.g. "unpublish everything tagged `vibecoding-risks`."
- **By explicit title(s)**: if the user names specific page(s) directly, use those — skip the tag search entirely. This is the only step explicit-title selection shortens; the trace in Step 3 still runs either way.

Either mode ends at the same thing: a candidate list of pages to remove. List the candidates back to the user before moving to Step 3 if the tag search returned more or fewer matches than expected.

## Step 3 — Trace the blast radius

This step always runs, regardless of how targets were selected — it protects the pages that are **staying published**, which matters whether the candidates came from a tag search or were named directly.

For every candidate page, search for incoming links from pages outside the candidate set:

```bash
grep -rl "\[\[<Candidate Title>" vaultRoot/wiki/concepts vaultRoot/wiki/entities vaultRoot/wiki/projects vaultRoot/wiki/articles
```

Exclude matches that are themselves candidates (those are moving anyway, so a link between two candidates isn't a problem). Every remaining match is a page that will end up with a dangling, unresolved wikilink once the move happens — list these explicitly in the Step 4 plan. Don't guess what to do with them; that's the user's call.

## Step 4 — Present the plan, then stop

Before touching anything, show:
- Every file moving: `vaultRoot/wiki/<zone>/<Title>.md` → `vaultRoot/wiki/unpublish/<Title>.md`.
- If moving more than ~5 documents, call that out explicitly (same bulk-operation threshold as `wiki-ingest`/`WIKI_INGEST_SPEC.md`).
- The full list of pages found in Step 3 that currently link to a candidate, each with a suggested resolution: fold that page into the batch too (if it's now effectively just about the removed topic), or strip/italicize the stale link (same pattern as the "Smart wikilinking" fix in `wiki-ingest` — prefer no link over a broken one). Present these as recommendations, not decisions already made.
- If two candidates from different zones share the same filename (rare, but the flat `unpublish/` folder can't hold both), flag the collision and ask how to resolve it (e.g. rename one) rather than silently overwriting.

End your turn here. Do not move or edit anything until the user's next message approves the plan.

## Step 5 — Write (only after approval)

1. Move each approved file from its zone into `vaultRoot/wiki/unpublish/<Title>.md`.
2. Add three frontmatter fields to each moved file, so it can be restored correctly later and the removal stays explainable:
   ```yaml
   unpublishedFrom: <original zone, e.g. concepts>
   unpublishedDate: <today, YYYY-MM-DD>
   unpublishedReason: <short note, in the user's own words if they gave one>
   ```
3. If the user approved fixes to any dangling links from Step 3/4, make those edits now (strip the link, or fold that page into this same unpublish batch — never a silent decision, only what was approved).
4. Report every file touched: what moved, what got stamped, what links got cleaned up.

## Step 6 — Guardrails

- Never delete. This moves files; it never removes them from the filesystem.
- Never auto-fix a dangling link without it being part of the approved plan.
- Ambiguous tag or title matches prompt rather than guess.
- A single unpublish run stays reviewable — Step 4's plan already covers the bulk-operation warning; no separate gate needed on top of it.

## Step 7 — Re-publish (the reverse path)

`wiki/unpublish/` is a holding folder, not a one-way trip. To restore a page: move `vaultRoot/wiki/unpublish/<Title>.md` back to `vaultRoot/wiki/<unpublishedFrom>/<Title>.md`, then remove the three `unpublished*` frontmatter fields added in Step 5. Same "present a plan, wait for approval" rule applies — don't do this silently even though it's restoring, not removing.

## Step 8 — Offer to refresh the deployed app's corpus

After writing (or re-publishing), offer both snapshot scripts, same as `wiki-ingest` Step 10 — no code changes are needed in either script for the removal (or restoration) to take effect, since `wiki/unpublish/` simply isn't one of the zone names `scripts/snapshot-wiki.mjs` scans:
- `node scripts/snapshot-wiki.mjs` — regenerates `data/wiki-index.js` without the unpublished page(s) (or with a restored page back in).
- `node scripts/snapshot-ingest-log.mjs` — only relevant if the ingest log should reflect this change; usually skip for a pure unpublish.
