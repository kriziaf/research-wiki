# Phase 1 Plan — Civic Tech Research Portal

Status: **v0.3.0 built** (Related articles + Recent search history on top of the v0.2.0 Conversational Ask flow and MVP1's Search, Retrieve, View Article) — in its own repo as of 2026-10-10. Ingest/Analyze not yet scoped to implementation detail.

## Source

Flowchart: [Figma board](https://www.figma.com/board/Vqe4cyALRFCiZ2ZaoRFyVu/Untitled?node-id=1-2) — "Researcher Portal" flow.

Reference pattern: [`WIKI_INGEST_SPEC.md`](./WIKI_INGEST_SPEC.md) — zone model, frontmatter contract, and ingest/query workflow extracted from the personal vault setup that produces the `wiki/` corpus this portal reads. Use it as the behavioral spec for Phase 2's Ingest/Search/Analyze implementation.

UI direction: [`DESIGN_STYLE_GUIDE.md`](./DESIGN_STYLE_GUIDE.md) (approved 2026-10-10) and its working preview [`design-system-demo.html`](./design-system-demo.html) — covers the search-console → cited-answer → split-pane-source-panel pattern this portal's Search & Retrieve flow should follow.

## Goal

A civic tech research portal: users search/browse a real knowledge base (built from an existing Obsidian vault) and read topic documents. Originally scoped as a restructuring of the `Marketing-RAG-Dashboard` prototype (keeping its marketing-content-generation features alongside this as additive new actions); now built as its own standalone repo instead — see the repo-history note under "MVP 1" below.

## Flow (from the board)

```
Researcher Portal
  -> Choose Action
       -> Ingest Documents
            -> Input Method (Upload Files | Paste Text)
            -> Extract & Parse Content
            -> Auto-Detect or Assign Topic Category
            -> Save to Research Repository
            -> Document Store (from GitHub repo)
       -> Search & Retrieve
            -> Enter Search Query
            -> Search Across Document Frontmatter
            -> Document Store
       -> Analyze Research
            -> Document Store
  Document Store
       -> Return Matching Results -> Display Retrieved Documents
       -> Compute Metrics (Total Files, Total Topics, Avg Files/Topic) -> Display Analytics Dashboard -> End: Insights Ready
```

## Decisions made

- **Keep, don't replace**: Generate Content, Find Patterns, and Chat AI Setup remain in the dashboard as-is. Ingest/Search/Analyze are *added* as new actions, not a rebuild of the whole app.
- **Content domain**: civic tech research notes, not the current healthcare-marketing mock content. Goal is for users to read real topic documents when searching.
- **Data backing**: real — sourced from the user's existing Obsidian vault, not simulated mock data (unlike the current Generate/Ingest/Find Patterns flows, which are all client-side mocks).

## Open questions — answered (2026-10-10)

1. **Vault location — superseded same day**: source switched from the raw `/Users/krizfernux/Obsidian Vault` notes to its agent-maintained wiki layer, now at:
   `/Users/krizfernux/Obsidian Vault/ant-colony/wiki-site/wiki/`
   (this path moved once already during scoping — was briefly a top-level `Obsidian Remote Vault/` sibling folder, then relocated under `ant-colony/` and renamed `wiki-site/`. Re-verify the path before implementation in case it moves again.)
   - `wiki/concepts/` — 71 files
   - `wiki/entities/` — 15 files
   - `wiki/projects/` — 3 files
   - `wiki/questions/`, `wiki/syntheses/` — present but empty (0 files each) as of 2026-10-10; placeholders for future content, not in scope until populated.
   - Rationale for switching: this `wiki/` layer is already topically organized and frontmattered by the maintaining agent, vs. the original vault's unstructured/mistagged notes.
2. **Note structure** — consistent across `wiki/concepts/`, `wiki/entities/`, `wiki/projects/`:
   - YAML frontmatter: `title`, `type` (`concept` | `entity` | `project`), `tags` (real topical tags, e.g. `civic-tech`, `governance`, `democracy`), `sources` (wikilinks back to raw source notes), `created`, `updated`.
   - Body: `# Title` heading, prose sections (`## Goals`, `## Related Concepts`, etc.), heavy use of `[[wikilinks]]` for cross-referencing other wiki pages.
   - One consistent shape — no normalization step needed, unlike the old two-note-type problem from the raw vault.
3. **Topic categorization** — solved by existing data: `type` and `tags` in frontmatter are already real and topical, maintained by the wiki agent. "Auto-Detect or Assign Topic Category" can read `tags`/`type` directly rather than running keyword-scoring logic from scratch. Content theme: AI ethics, civic tech, socio-technical design, SLMs, conversational design.

## Still open before Phase 2 scoping

- **Off-topic content in the corpus**: `wiki/projects/Page-Blueprint-Skills.md` is about a Figma/Cursor page-builder skill, not civic tech — confirms `wiki/projects/` isn't guaranteed single-topic. Categorization/filtering needs to handle (or exclude) non-civic-tech entries rather than assume the whole corpus fits the theme.
- Whether to also ingest `wiki/index.md` (agent-maintained global index) as a browsable entry point, or treat it purely as a crawl aid.
- Whether `sources:` wikilinks (pointing into `raw/clippings`, `raw/papers`, etc., which live outside `wiki/`) should be resolved so a topic document can link back to its original source note, or whether Phase 1 only ever surfaces the `wiki/` layer itself.
- Whether the ~89-file `wiki/` corpus is loaded by filesystem read (static export, e.g. a build step copying into `public/`) vs. some live local file access — no git remote exists on the Obsidian side yet, so "Document Store from github repo" per the flowchart isn't literal today.

## Not yet decided / deferred to Phase 2 scoping

- Whether "Document Store from github repo" means live GitHub API reads/writes (needs auth + backend) vs. a build-time export of the vault into the repo's `public/`-style static files.
- Metrics tile design for Total Files / Total Topics / Avg Files per Topic (likely replaces the currently-hidden Content Chunks/Queries/Avg Response/Accuracy metrics section).

## MVP 1 — built and tested (2026-10-10)

Scope: **Search, Retrieve, View Article only.** Ingest is deferred to a later pass — no ingest UI exists in this repo yet.

Built as `index.html` + `research.css` + `research.js` + `data/wiki-index.js`, following the search-console → results → article-with-split-pane pattern from `design-system-demo.html`/`DESIGN_STYLE_GUIDE.md`. Data source: a manual one-off snapshot of `wiki/concepts|entities|projects/*.md` (89 documents) via `scripts/snapshot-wiki.mjs` — not a repeatable/live pipeline yet, rerun by hand when the vault changes.

Tested end-to-end in browser against real data: search scoring (title/tag/type/body matches), results list, markdown + `[[wikilink]]` rendering (headings, bold, italic, lists), split-pane citation preview at both desktop (side-by-side) and narrow (overlay+backdrop) widths, and back-navigation through the article/results/search history stack. No console errors.

**Repo history note**: this was originally built inside `Marketing-RAG-Dashboard` (editing its `index.html`/`script.js` in place, e.g. `analyzeContent()`/`executeQuery()` at `script.js:618-635`). On 2026-10-10 it was split out into this standalone repo so it no longer overrides that repo's canonical marketing-dashboard prototype — `index.html`/`research.js` here are the real, current versions; any earlier line-number references to `script.js` describe the old (now-reverted) location, not this repo.

Not yet built: Ingest (upload/paste → parse → categorize → save), Analyze (metrics dashboard), and a repeatable (non-manual) data pipeline.

## v0.2.0 — Conversational Ask Flow (2026-10-10)

Replaced the home screen's default behavior: submitting a question now drives a chat-style "ask" screen instead of the MVP1 results list, following `DESIGN_STYLE_GUIDE.md`'s approved search-console → cited-answer → split-pane pattern (previously only prototyped in `design-system-demo.html`).

Behavior, built against the real 89-doc corpus (no LLM — still the same keyword `search()` scorer from MVP1):
- The question is shown as a right-aligned chat bubble.
- The top-scoring doc's body is rendered as the answer (markdown + `[[wikilink]]` rendering reused as-is from the article view).
- A "Sources: X, Y +N more" chip summarizes the top matches (type-dot icons); clicking it, or any inline wikilink citation inside the answer, opens the existing split-pane source preview — generalized via a new shared `.rw-split-layout` CSS class so both the ask screen and the article screen drive the same preview/backdrop behavior. The preview's "Open full document →" CTA navigates into the full article screen.
- A follow-up input appends new Q&A turns onto the same back-navigation stack (`askQuery(query, fresh)` — `fresh: true` from the home screen resets the stack, `fresh: false` from a follow-up pushes onto it), so "Back" steps through prior questions.
- Home's chip section relabeled "Try one of these" → "Recommended" to match the design guide's component inventory.

A tabbed "Ask Wiki" / "Classic Search" toggle was prototyped and explicitly rejected — the ask flow is the only entry point for now. The MVP1 results-list screen (`rw-screen-results`, `runSearch`/`renderResults` in `research.js`) is **not removed**, just currently unreachable from the UI, in case a dedicated classic-search entry point is reintroduced later.

Files touched: `index.html`, `research.css`, `research.js`.

## v0.3.0 — Related Articles + Recent Search History (2026-10-10)

Two follow-on refinements to the v0.2.0 Ask flow, both built from a real reference screenshot (Reddit Answers) but adapted to this portal's own design system rather than copied literally:

- **Related articles**: the dormant MVP1 results-list screen (`rw-screen-results`, flagged above as "unreachable but kept") is no longer dead code — it's repurposed as a **"View related articles"** destination reached from a new button at the bottom of the full article view. `findRelated(doc)` scores every other doc by shared-tag count (+1 for same `type`), no new data needed since tags are already real/topical. `showRelated`/`renderRelated` push a `{screen:'related', id}` stack entry so Back correctly chains related-list → article → wherever the article was opened from (ask screen or another related list). The screen's old "← New search" (full stack reset) became "← Back" (`goBack()`), since it's now only ever entered contextually from an article, never from home.
- **Recent search history**: a "Recent" section now renders on the home screen directly below "Recommended" (reversed from the reference screenshot's order, per explicit direction), hidden until at least one question has been asked. Backed by `localStorage` (`rw-recent-queries`), capped at 3, de-duped case-insensitively, each entry dismissible with an × without triggering the query. Every submitted question — home search, a Recommended chip, or a follow-up — logs to Recent via `addRecent()` inside `askQuery()`. Styled with a bordered `.rw-chip.recent` variant built from the same `--rw-*` tokens as everything else, distinguishing it from Recommended's filled chip per `DESIGN_STYLE_GUIDE.md`'s own Recent-vs-Recommended component spec.

Files touched: `index.html`, `research.css`, `research.js`.
