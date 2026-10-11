# Phase 1 Plan — Civic Tech Research Portal

Status: **Phase 1 complete as of v0.5.5** (Curated Recommended topics + a pinned-answer fix for the search scorer, on top of v0.4.0's Conversational answer preview/follow-up topics, v0.3.0's Related articles/Recent search history, and the v0.2.0 Conversational Ask flow) — in its own repo as of 2026-10-10. Phase 2 (Ingest/Analyze + Login/User Accounts) is in planning — see [`PHASE2_PLAN.md`](./PHASE2_PLAN.md).

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

## Phase 2 scoping

Ingest/Analyze open questions and the Login/User Accounts plan moved to [`PHASE2_PLAN.md`](./PHASE2_PLAN.md) so this doc stays a record of completed Phase 1 work.

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

## v0.4.0 — Conversational Answer Preview + Follow-up Topics, Footer (2026-10-10)

- **Shortened, conversational answers**: `renderAsk()`'s answer body no longer dumps the full matched doc — a new `previewParagraphs(body, count)` walks the markdown line-by-line (reusing the same tokenizing rules as `renderMarkdown`) but skips headings/list items, collecting only the first 2 plain-prose paragraphs ("the description + the next paragraph"). Falls back to the existing `snippet()` helper for the rare doc with no lead prose. A `Continue reading "<title>" →` link under the preview opens the full article (`openArticle`), same call the Sources-chip preview already used.
- **3 related follow-up topics**: below the preview, up to 3 tag-related docs (reusing `findRelated()` from v0.3.0 — no new scoring logic) render as pill suggestion chips, phrased "What is X?" / "Who is X?" per `design-system-demo.html`'s own Recommended-chip convention (`topicQuestion()`). Clicking one calls `askQuery(question, false)` — a follow-up turn appended to the conversation, same as typing in the follow-up box.
- **Footer**: a subtle footer (`.rw-footer`) now runs along the bottom of every screen — "Created for Open Civic Tech" linking to opencivic.tech, and "Smol Wiki Chat v`APP_VERSION`" (renamed from "Research Wiki Chat" 2026-10-10) on the right. `APP_VERSION` is a single constant at the top of `research.js`; bump it there when tagging a new version and the footer updates everywhere with no HTML changes.

Files touched: `index.html`, `research.css`, `research.js`.

## v0.4.1 — Curated Recommended Topics + Pinned-Answer Fix (2026-10-10)

- **Curated Recommended topics**: the home screen's "Recommended" chips are no longer auto-picked (2 docs per type); `RECOMMENDED_TOPICS` in `research.js` now hardcodes the 6 user-specified questions (Civic.ai 6-Pack of Care, who maintains Smol Gardens, RAG vs. the LLM wiki pattern, Accountable AI, BetaNYC, vibecoding risks), each mapped to its real doc id and displayed as the full phrased question rather than the raw doc title.
- **Pinned-answer correctness fix**: verifying the above surfaced a real bug — phrased questions like "Who is BetaNYC?" don't reliably rank their target doc first in the keyword `search()` scorer (common words like "who"/"is"/"the" dilute the score toward unrelated, longer docs; 3 of the 6 curated topics mis-resolved). This also silently affected the v0.4.0 follow-up-topic suggestion chips (same "What is X?"/"Who is X?" phrasing). Fixed generally: `askQuery(query, fresh, pinnedId)` gained an optional third argument; `buildAskResults(query, pinnedId)` pins the known target doc as the top answer while still running real search to populate the Sources chip around it. Back-navigation stack entries now also store `pinnedId` so re-rendering an earlier turn restores the same pinned doc. Verified all 6 Recommended topics and the follow-up-topic chips now resolve to the correct doc.

Files touched: `research.js`.

## v0.4.2 — Header Nav Bar (2026-10-10)

Pulled the topbar pattern from `spec/design-system-demo.html` and adapted it per explicit scope direction (minimal/functional, not full demo fidelity): the previously bare `.rw-topbar` (wordmark + doc count only) now has left/right groups —

- **Left**: a hamburger menu icon (`#rw-menu-btn`) — intentionally non-functional for now, a visual placeholder matching the demo's pattern — plus the existing wordmark.
- **Right**: the existing doc count, a "Log in" button (`#rw-login-btn`, updated from an initial "Open Civic Tech" link), and an avatar placeholder button (`#rw-avatar`) — both are non-functional stubs for the Clerk-based login planned in `spec/PHASE2_PLAN.md`, styled/titled as "coming soon" rather than a real signed-in state.
- The footer's own "Created for Open Civic Tech" link + version line is **unchanged** (explicit user instruction to keep it as-is).
- Right-side items (doc count, link) hide under 480px to keep the topbar from crowding on narrow screens; hamburger, wordmark, and avatar stay visible.

Files touched: `index.html`, `research.css`, `research.js`.

## v0.4.3 — Typography (2026-10-10)

**Retroactive entry** — this shipped as two commits (`26df3c0`, `f0482a2`) without a spec section or `APP_VERSION` bump at the time; recording it now while adding v0.5.0 below, rather than leaving the gap.

- **Body/UI font → Source Sans Pro**, loaded via Google Fonts (`Source Sans 3`, its current distribution name) with a preconnect + stylesheet link in `index.html`; `--rw-font-body` falls back to the prior system sans stack if the web font fails. Weights: 400, 400 italic, 600, 700.
- **Heading font → Space Grotesk** (weight 700), replacing the serif `Iowan Old Style` — an explicit reversal of the design guide's original "deliberately not Inter/Space Grotesk" call, noted inline in `spec/DESIGN_STYLE_GUIDE.md` rather than silently overwritten.
- **Article paragraph-spacing bug fixed**: `.rw-body p` had `margin-bottom:14px` against a `line-height:1.65` (~25px) — paragraphs were gapped *tighter* than their own internal line spacing. `margin-bottom` now matches `line-height` exactly (`1.65em`); heading top-margins moved to proportional `em` values for the same reason.

Files touched: `index.html`, `research.css`, `spec/DESIGN_STYLE_GUIDE.md`.

## v0.5.0 — Topics Page (browse by tag) (2026-10-10)

New top-level screen reachable via the header's hamburger icon (`#rw-menu-btn`, previously a non-functional placeholder from v0.4.2 — now labeled "Browse topics"), for exploring the corpus by tag instead of only via search/ask.

- **Search input** — live-filters the grid by title or tag substring as you type (`topicSearchQuery`), no Enter required.
- **Tag pills** — single-select filter row plus an "All" reset. Capped to the **top 20 tags by frequency** (`TOPIC_PILL_LIMIT`), not every tag: the corpus has 196 unique tags, but 126 of them appear on exactly one document — true one-offs that would clutter a pill row without adding real browsing value. Those long-tail tags stay reachable through the search input, just not as a dedicated pill. Sort is data-driven (frequency desc, then alphabetical), not hardcoded — grows correctly as the corpus does.
- **Card grid** — reuses the existing `.rw-result-card` component and a newly-factored `renderResultCard(d)` helper (previously inlined only in `renderRelated`, now shared) rather than introducing a new card design; responsive 3→2→1 column grid.
- Fully integrated into the existing navigation stack: entering via the hamburger resets to a fresh `{screen:'topics'}` stack entry (same `fresh` pattern as `askQuery`), opening a card pushes an `article` entry on top of it, and `goBack()` correctly restores the topics screen (filter/search state preserved, since it lives in module-level vars, not the stack entry) when backing out of an article.
- Adapted from a reference UI screenshot per the session's established pattern: reused this app's own card/pill/chip components and `--rw-*` tokens rather than copying the reference's literal visual styling (navy active-pill color, icon treatment, separate "Read the topic →" link text — the whole card is already clickable here, matching every other card in the app, so that link was dropped as redundant).

Files touched: `index.html`, `research.css`, `research.js`.

## v0.5.1 — Hamburger Dropdown Menu (2026-10-10)

The hamburger icon (`#rw-menu-btn`), which v0.5.0 wired to navigate straight to the Topics page, now opens a dropdown menu instead: **Ask Wiki**, **Search Topics**, a divider, then **Log in** at the bottom.

- "Ask Wiki" resets to the home/search screen using the same logic as the existing "New question" button (clear input, reset `stack`, focus input). "Search Topics" calls the existing `showTopics()` — no new navigation logic needed. "Log in" is an inert stub, matching the standalone `#rw-login-btn`'s existing behavior.
- Menu closes on: selecting an item, clicking outside it (new `document` click listener), or Escape (extended the existing pane-closing Escape handler rather than adding a separate one).
- Confirmed explicitly with the user: the standalone "Log in" button and avatar icon already in the top-right of the header are **unchanged** — this adds a second path to the same (still non-functional) Log in action, not a consolidation.

Files touched: `index.html`, `research.css`, `research.js`.

## v0.5.2 — Renamed to Smol Wiki (2026-10-10)

App renamed from "Research Wiki" to "Smol Wiki" throughout the live product: browser tab title, header wordmark, home headline ("Ask the research wiki" → "Ask Smol wiki" — the user's exact phrasing, dropping "the"), and the footer's "Smol Wiki Chat v`APP_VERSION`" line. Also updated: `README.md`'s title, code comment headers in `index.html`/`research.css`/`research.js`, and the two "Research Wiki app" mentions in `.claude/skills/wiki-ingest/SKILL.md`.

**Deliberately left untouched**: `spec/design-system-demo.html` — explicitly a frozen historical mockup (per its own documented status as "the original interactive mockup... superseded by the real app"), not live product; retroactively renaming it would misrepresent what was actually approved under that name at the time. Also untouched: the actual GitHub repository name (`kriziaf/research-wiki`) — a platform-level rename, not a text edit, left for the user to action separately if wanted.

Files touched: `index.html`, `research.css`, `research.js`, `README.md`, `.claude/skills/wiki-ingest/SKILL.md`.

## v0.5.3 — Ingest Log (2026-10-10)

New sub-nav page (hamburger menu, between "Search Topics" and the Log-in divider) showing wiki-ingest activity as a date-stamped, collapsible timeline — "so I know... the number of articles added to wiki."

- **New data snapshot**: `scripts/snapshot-ingest-log.mjs`, a sibling to `scripts/snapshot-wiki.mjs` (same config/portability pattern — reads `vaultRoot` from the gitignored `.claude/wiki-ingest.local.json`, no hardcoded path). Scans `vaultRoot/raw/clippings/*.md`, groups by date (`created:` frontmatter, filesystem mtime fallback for the files missing it — 9 of 30 in the real corpus), writes `data/ingest-log.js` sorted newest-first. Real result: 30 articles across 8 distinct ingest days, from 1 to 17 articles in a day.
- **UI**: each date row (formatted `MM.DD.YYYY`, matching the vault's own `inbox/10.10.2026/`-style folder convention rather than the app's internal `YYYY-MM-DD`) is collapsed by default — date + article count only — and expands on click to list that day's article titles. A summary line up top gives the running total (articles processed / days active). Entries aren't individually clickable — raw clippings have no corresponding viewer screen in this app, so the list stays plain text rather than implying a dead link.
- **`wiki-ingest` skill updated**: Step 9 now offers regenerating both snapshots (`snapshot-wiki.mjs` and `snapshot-ingest-log.mjs`) after a write, not just the wiki corpus one.

Files touched: `index.html`, `research.css`, `research.js`, `scripts/snapshot-ingest-log.mjs` (new), `data/ingest-log.js` (new), `.claude/skills/wiki-ingest/SKILL.md`.

## v0.5.4 — Full-Article Document Type (2026-10-10)

New optional `wiki-ingest` output: a `type: full-article` page (`wiki/articles/<Title>.md`) holding the complete article text, tagged `full-article`, with `sourceUrl:`/`sourceAuthor:` frontmatter — additive alongside the usual concept/entity extraction, not a replacement.

- **Copyright boundary, decided explicitly with the user before building**: the full text stays private-vault-only. `scripts/snapshot-wiki.mjs` now has a dedicated `wiki/articles/` zone that exports only a short excerpt (`EXCERPT_LENGTH = 840` chars, 3x the original 280 — bumped for more context per the user's follow-up) plus `sourceUrl`/`sourceAuthor` — never the full body — so the public repo/app never carries a complete reproduction of externally-sourced copyrighted text. `concepts/`/`entities/`/`projects/` processing is unchanged (that content is original synthesis, already safe to publish in full).
- **App**: `openArticle()` renders a "Read full article →" link (to `sourceUrl`) plus an author credit line when present, in a new `#rw-article-source` block above the body. New `--rw-type-full-article` color token gives full-article entries their own type-dot color, consistent with concept/entity/project.
- No changes needed to `search()` or the Topics page's tag-pill filtering — both already work generically off `title`/`tags`/`type`/`body`, so `"full-article"` in `tags:` makes it filterable there for free.
- Supersedes the earlier-parked "Surface Original Article + Author Credit" idea in `spec/PHASE2_PLAN.md` with this narrower, concrete design — see that doc for the updated section.

Files touched: `index.html`, `research.css`, `research.js`, `scripts/snapshot-wiki.mjs`, `.claude/skills/wiki-ingest/SKILL.md`.

## v0.5.5 — Structured Original Summaries for Full-Article Pages (2026-10-10)

Follow-on to v0.5.4: the mechanical 840-char excerpt wasn't a good summary — "not very good summaries as they are written today." Replaced with an original, structured synthesis instead of a longer verbatim slice, modeled on a Reddit-Answers-style reference (headline + bold-lead-in claims), adapted for a single-source article rather than multi-source aggregation.

- **New body structure for `wiki/articles/<Title>.md`**: a short original summary (headline + 2–4 bold-claim bullets explaining why the topic matters, in the ingest author's own words — at most a short fragment of direct quote, never a reproduced passage) sits above a `<!-- FULL ARTICLE TEXT BELOW — PRIVATE VAULT ONLY, NEVER EXPORTED -->` marker; the complete verbatim text stays below it, unchanged from v0.5.4's behavior.
- **`scripts/snapshot-wiki.mjs`**: new `publicBody()` splits the raw body on that marker and exports only what's above it. **Hardened to fail closed, not open**, per explicit follow-up request: a missing marker excludes the doc from export entirely (no raw-text fallback of any length, replacing the earlier 840-char `excerpt()` fallback); a summary over a 1,200-char `SUMMARY_MAX_LENGTH` ceiling throws and halts the whole snapshot run rather than silently writing a too-long summary (almost certainly an accidental raw-text paste) to the committed output. Both paths verified with real negative tests — a no-marker file (confirmed excluded, not in `data/wiki-index.js`) and an oversized-summary file (confirmed the script throws and the previously-written output file is left untouched/valid).
- **No app rendering changes needed** — `renderMarkdown()`/`renderInline()` already handle `##` headers, `**bold**`, and lists, so the structured summary just renders correctly through existing infrastructure.
- Retrofitted the existing test entry (`The Humanities Are the Moat`) to the new structure; verified the exported `data/wiki-index.js` body is the full ~1,190-character structured summary with zero raw-article-text leakage.
- `.claude/skills/wiki-ingest/SKILL.md` updated with the template and the "short fragment or no quote, never a reproduced passage" constraint, since this is instructions a future ingest run follows literally.

Files touched: `scripts/snapshot-wiki.mjs`, `.claude/skills/wiki-ingest/SKILL.md`.

## Smart Tagging Guidance + Humanities Tag Fixes (content/skill-doc only, 2026-10-10)

No app code changed — content/vault edits plus a `wiki-ingest` guidance addition, same pattern as the earlier concept restructuring (no `APP_VERSION` bump).

- **Tags applied**: `skills-erosion` (new to the corpus) added to `Automation and the Erosion of Practiced Judgment` and the full-article page; `critical-thinking` added to `Humanities Defunding and the AI Skills Gap` and the full-article page (the other 4 Humanities-related concept pages already had it).
- **`.claude/skills/wiki-ingest/SKILL.md`** gained a "Smart tagging" guideline in Step 4, prompted by the real problem found during the Topics page work (196 unique tags, 126 single-use): check the existing vocabulary before inventing a tag, reason from four loose categories (Domain / Skill-Capability / Mechanism-Phenomenon / Format) rather than free-associating, and cap at 3–5 tags per page.

Files touched: `.claude/skills/wiki-ingest/SKILL.md`.

