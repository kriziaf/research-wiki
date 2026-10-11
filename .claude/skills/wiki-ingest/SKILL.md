---
name: wiki-ingest
description: Ingests one or more local articles (found by title in the user's configured source folders, e.g. an Obsidian "Clippings" inbox and a backup folder, or given as explicit file paths directly) into their wiki vault — copying each raw source into the vault's raw/clippings/ zone and writing or updating frontmattered concept/entity/project pages in wiki/, following the zone model and governance rules in spec/WIKI_INGEST_SPEC.md. Handles files with partial or no frontmatter (synthesizes minimal metadata rather than fabricating a source). Always presents a plan and waits for explicit approval before writing anything. Use when the user says "ingest this," "add this to the wiki," "run wiki-ingest," "pick up [file(s)]," or asks to bring an article/clipping/note into the wiki vault.
---

# Wiki Ingest

Ingests one article at a time from the user's own vault into their wiki, following the zone model and frontmatter contract documented in `spec/WIKI_INGEST_SPEC.md`. This skill never hardcodes a path — every filesystem location comes from the user's local config (step 1), so this skill works for anyone who clones this repo and points it at their own vault.

**This is not the in-app Ingest UI.** The deployed Smol Wiki app (`index.html`/`research.js`) has no Ingest flow yet (see `spec/PHASE2_PLAN.md`) — this skill operates directly on the local filesystem, outside the app, the same way the user's own `wiki-ingest` command does on their personal setup.

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

- `vaultRoot` must contain `raw/clippings/`, `wiki/concepts/`, `wiki/entities/`, `wiki/projects/`, `wiki/articles/` (create these if the vault doesn't have them yet and the user confirms that's intentional).
- `sourceFolders` is searched recursively for candidate `.md` files.

If this file doesn't exist, ask the user for both paths, then write the file (it's gitignored — confirm with `git check-ignore .claude/wiki-ingest.local.json` if unsure — so it never gets committed).

## Step 2 — Search (or take explicit paths)

Two ways in:
- **By title/fragment**: search every `sourceFolders` entry recursively (case-insensitive) for matching `.md` filenames.
- **By explicit path(s)**: if the user gives one or more file paths directly (e.g. "pick up `/path/to/a.md` and `/path/to/b.md`"), use those verbatim — they don't have to live inside a configured `sourceFolders` entry. `sourceFolders` is a convenience for title-based search, not a restriction on what can be ingested.

Either way, also check `vaultRoot/wiki/{concepts,entities,projects}/*.md` titles (frontmatter `title:` field, or filename) for an existing match — if found, say so; the user may still want to append new source material to it (see Step 5) rather than treating it as net-new.

## Step 3 — Disambiguate

If more than one candidate file matches a title/fragment search, list them with size and modified date (a short table is enough) and ask the user which one to use. Don't guess. (Not applicable when the user gave explicit paths — those are already disambiguated.)

## Step 4 — Analyze

Read the chosen file(s) — more than one at a time is fine (e.g. two linked articles ingested together); when they're thematically related, let candidate concepts/entities cite and cross-link to each other, not just back to their own single source. Identify 3–7 candidate concepts and 1–3 candidate entities worth their own wiki page (per the spec: "check existing `wiki/concepts/` and `wiki/entities/` for matches before creating duplicates"). For each candidate, check whether a same-titled page already exists under `wiki/concepts/` or `wiki/entities/` — if so, it's an **append**, not a new page.

**Smart tagging**: choosing tags is not "write down a word that fits" — the corpus has 196 unique tags with 126 appearing on exactly one document, which is fragmentation, not a vocabulary. Before adding any tag:
- **Check before inventing.** Scan the existing tag vocabulary (`grep -rh "^\s*-\s" wiki/*/*.md` or equivalent) for something that already covers the idea — reuse it rather than creating a near-synonym (don't add `judgement` next to an existing `critical-thinking` that means the same thing here).
- **Categorize by type, not just topic.** Reason from four loose buckets, not a closed list: **Domain** (humanities, ai-ethics, sts, civic-tech, design...), **Skill/Capability** (critical-thinking, close-reading...), **Mechanism/Phenomenon** (automation, skills-erosion, policy...), **Format** (canon, case-study, framework...). A good tag set usually draws from more than one bucket — five domain tags and nothing else is a sign the page needs sharper tags, not more of them.
- **Cap it** at a handful (3–5) per page, matching what's already typical in this corpus.

**Sourceless files**: if a file has partial or no frontmatter — no `source:` URL, no `title:`, reads as an original note/reflection rather than an external clipping — don't fabricate a citation. Synthesize minimal frontmatter instead: `title` from the filename or an obvious first line, `created` as today, `type: note` (instead of the implicit clipping type), and simply omit `source:`/`author:` rather than inventing them. Say so explicitly in the Step 5 plan so the user can correct it if the file actually does have a source you missed.

**Full-article option — articles only, never research papers**: in addition to the usual concept/entity extraction, offer (don't assume) creating a `wiki/articles/<Title>.md` page holding the complete text verbatim, tagged `type: full-article` plus `"full-article"` in `tags:`, with `sourceUrl:`/`sourceAuthor:` frontmatter pointing at the real source. **Only offer this for articles** (blog posts, newsletter pieces, essays, news — the kind of thing that lands in `raw/clippings/`), **never for research papers** (journal/conference papers, preprints, anything that belongs in `raw/papers/` instead). Classify using whatever signals are available — `source:` domain (`arxiv.org`, `doi.org`, journal/publisher domains, `.edu` paper/PDF pages), a DOI, a `published:` field citing a journal/conference, or the file simply being a PDF-derived academic paper. If genuinely ambiguous, ask rather than guess, per Step 7's governance rule. Research papers still get the normal concept/entity synthesis (Step 4 above) — they're just never candidates for a verbatim full-text copy, full stop, regardless of private-vault-only status.

**This page is private-vault-only by design** — it must never be treated as something that flows into the public app at full length. `scripts/snapshot-wiki.mjs` enforces this on the export side (Step 9), but don't undermine that here either: never paste the full article text into your own chat response when proposing or confirming this plan — describe it by title/word-count, the way you would any other file write.

**Write a structured summary in the body — an original synthesis, not a truncated quote.** This is what the public app actually shows for a full-article entry, so it needs to earn its place. Structure it like a concept page's opening (Step 4's synthesis pattern), not a Reddit-Answers-style multi-source round-up:

```markdown
## <short headline naming what the topic is>

**<Bold claim 1, your own words>.** <short supporting clause — at most a few words of direct quote if any, never a reproduced sentence or paragraph>

**<Bold claim 2>.** <...>

<!-- FULL ARTICLE TEXT BELOW — PRIVATE VAULT ONLY, NEVER EXPORTED -->

<complete article text, verbatim, as before>
```

The marker line is load-bearing: `scripts/snapshot-wiki.mjs` splits on it and exports only what's above it (Step 9). Everything below stays private-vault-only. Explain *why the topic matters* — stakes, the argument's shape, who should care — in 2–4 bullet-style claims; never paraphrase-by-truncation. Include the summary text in the Step 5 plan like any other content, so the user can see and approve the actual wording before it's written.

## Step 5 — Present the plan, then stop

Before writing anything, list exactly what will happen:
- The raw copy: `vaultRoot/raw/clippings/<today's date, YYYY-MM-DD>-<kebab-case-slug-of-title>.md` (new file; never overwrites an existing raw file — if the slug already exists, say so and ask how to proceed instead of silently renaming).
- Each wiki page: `vaultRoot/wiki/<zone>/<Title>.md` — marked **new** (full frontmatter: `title`, `type`, `tags`, `sources: ["[[raw-slug]]"]`, `created`, `updated` both set to today) or **append** (existing file gets the new `[[raw-slug]]` added to its `sources:` list, `updated:` bumped to today, and any genuinely new nuance folded into the body — never a wholesale rewrite of existing content).
- If the full-article option is in play: `vaultRoot/wiki/articles/<Title>.md` as its own explicit line item (new or append, same rules), noting it holds the complete text and is private-vault-only.

End your turn here. Do not call Write/Edit until the user's next message approves the plan. If they want changes (different tags, skip an entity, rename a page), revise the plan and present it again rather than writing a partial version.

## Step 6 — Write (only after approval)

Execute exactly the plan as approved (or as revised in the follow-up). After writing, report every file touched with its final path, and which were new vs. appended.

## Step 7 — Guardrails

- Never delete anything.
- Never silently overwrite an existing wiki page — append/merge only, per the spec's governance rules.
- If ambiguous whether something is a concept, entity, or project, ask rather than guess.
- A single ingest naturally stays small (one raw file + a handful of wiki pages) — the plan in Step 5 already covers the ">5 documents" bulk-operation warning from the spec; no separate gate is needed on top of it.

## Step 8 — Out of scope (v1)

URL ingestion (the spec's `defuddle` reference) isn't implemented here — this skill only handles files that already exist locally (whether found via `sourceFolders` search or given as explicit paths, per Step 2). Fetching and cleaning a live URL isn't built.

## Step 9 — Offer to refresh the deployed app's corpus

After a successful write, offer (don't auto-run) both snapshot scripts — they read `vaultRoot` from the same `.claude/wiki-ingest.local.json`, so no path duplication:
- `node scripts/snapshot-wiki.mjs` — so the newly ingested page becomes searchable in the deployed Smol Wiki app's `data/wiki-index.js`.
- `node scripts/snapshot-ingest-log.mjs` — so the ingest shows up on the app's "Ingest Log" page (`data/ingest-log.js`), grouped by date.
