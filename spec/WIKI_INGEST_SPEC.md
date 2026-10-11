# Wiki-Ingest Pattern — extracted reference spec

Extracted 2026-10-10 from a working personal setup at `/Users/kriziasantcolony/vault/` (separate machine user, not part of this repo). That setup is Claude Code slash commands operating directly on an Obsidian vault via Bash/WebFetch — it is **not directly portable** to this client-side dashboard. This doc distills the pattern so Phase 2 can re-implement the same behavior as in-app logic/UI.

Source files:
- `.claude/commands/wiki-ingest.md`
- `.claude/commands/wiki-query.md`
- `CLAUDE.md` (zone model + frontmatter contract + governance rules)
- `.claude/skills/defuddle/SKILL.md` (URL → clean markdown extraction)

## Zone model → maps to the flowchart's "Document Store"

| Zone | Rule | Portal equivalent |
|---|---|---|
| `raw/` | Read-only sources (clippings, papers). Never edited/renamed/moved. | Original uploaded/pasted documents, immutable once ingested. |
| `wiki/` | LLM-owned. Synthesized concepts/entities/projects, frontmattered, cross-linked. | **This is the Document Store** the civic-tech portal already scans (`wiki/concepts`, `wiki/entities`, `wiki/projects`). |
| `wiki/unpublish/` | Flat holding folder, sibling to `wiki/concepts`/`entities`/`projects`/`articles`. Pages removed from publication via `wiki-unpublish`, never deleted — stamped with `unpublishedFrom`/`unpublishedDate`/`unpublishedReason` for traceability and reversal. | Invisible to `scripts/snapshot-wiki.mjs` by construction — `unpublish` isn't one of the four zone names it scans, so a moved page simply stops appearing in the next export. Re-publish is moving the file back. |
| `inbox/` | Staging drafts, requires explicit approval before promotion to `wiki/`. | Maps to "Ingest Documents" happening *before* "Save to Research Repository" in the flowchart — a built-in pending state. |
| `dev/` | Collaborative technical notes (ADRs, debriefs). | Out of scope for the portal. |

## Frontmatter contract (required on every Document Store entry)

```yaml
title: <string>
type: concept | entity | project   # extend as needed
tags: [tag1, tag2]                  # topical, kebab-case
sources: ["[[wikilink-to-raw-source]]"]
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

This is already the real shape found in `wiki/concepts/*.md` — confirms "Search Across Document Frontmatter" (flowchart) is viable as literally searching these fields.

## Ingestion workflow → maps to "Ingest Documents" branch

1. **Determine source type** — URL (clean-extract via `defuddle`) or local file/pasted text (read directly). Portal equivalent: `Input Method (Upload Files | Paste Text)`.
2. **Save raw content** to an immutable raw store with capture metadata (source, date, title, author if inferable).
3. **Analysis** — identify 3–7 key concepts + 1–3 entities; check existing `wiki/concepts/` and `wiki/entities/` for matches before creating duplicates. Portal equivalent: `Auto-Detect or Assign Topic Category`, but as **candidate concepts/entities with dedup against existing tags**, not just a single topic label.
4. **Present a plan and wait for approval before writing** — not in the current flowchart at all. This is the key gap: the flowchart goes straight from parse → auto-categorize → save, with no human checkpoint. Worth adding a review step before `Save to Research Repository` commits.
5. **On approval**: write/update pages — existing concepts get *appended* sources/nuance, never wholesale rewrites. Report every affected file.

## Query workflow → maps to "Search & Retrieve"

1. **Candidate search first, full reads second** — search titles/frontmatter/tags across the Document Store before reading file bodies. Prioritize the synthesized `wiki/` layer over raw sources.
2. **Bounded reads** — cap how many candidate documents get fully read/displayed (reference implementation caps at 10); surface "N more matches" rather than reading everything.
3. **Cite the source document** for every answer/result shown — results should carry a visible link back to the originating document, not just a snippet.
4. **Say so when the corpus doesn't have an answer** — explicit empty/insufficient-result state, not a fabricated result. Relevant for Phase 1's `analyzeContent()`/search UI, which currently only toasts and doesn't render a results list at all.

## Governance rules worth porting into Phase 2 scoping

- Never silently overwrite an existing concept/topic document — merge/append instead.
- Any bulk operation touching more than ~5 documents shows a plan before executing.
- Deletions require explicit confirmation.
- Ambiguous zone/category assignment should prompt rather than guess.

## Explicitly not portable as-is

- The commands assume a real filesystem + Bash + git-managed vault. This dashboard's Ingest/Search/Analyze flows are currently client-side mocks over a static export — there is no live file-write step, so "present plan → wait for approval → write" needs a client-side equivalent (e.g., a review modal before adding to an in-memory/localStorage store) rather than a CLI confirmation prompt.
- `defuddle` (URL-to-markdown extraction) is only relevant if Phase 2 ever adds URL ingestion; today's flowchart only specifies Upload Files | Paste Text.
