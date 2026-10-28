# Phase 1 Plan — Civic Tech Research Portal

Status: **Phase 1 complete as of v0.5.9** (hash-based page routing + a local page-view tracking hook, on top of v0.5.8's body-margin fix, v0.5.7's search autocomplete, v0.5.6's wikilink-tightened Related Articles, v0.5.5's structured original summaries, v0.4.0's Conversational answer preview/follow-up topics, v0.3.0's Related articles/Recent search history, and the v0.2.0 Conversational Ask flow) — in its own repo as of 2026-10-10. Phase 2 (Ingest/Analyze + Login/User Accounts) is in planning — see [`PHASE2_PLAN.md`](./PHASE2_PLAN.md).

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

## Smart Tagging Guidance + Humanities Tag Fixes + Recommended Chip Swap (content/small UI tweak, 2026-10-10)

Mostly content/vault edits plus a `wiki-ingest` guidance addition (same pattern as the earlier concept restructuring — no `APP_VERSION` bump), plus one small, unrelated `research.js` edit bundled into the same commit.

- **Tags applied**: `skills-erosion` (new to the corpus) added to `Automation and the Erosion of Practiced Judgment` and the full-article page; `critical-thinking` added to `Humanities Defunding and the AI Skills Gap` and the full-article page (the other 4 Humanities-related concept pages already had it).
- **`.claude/skills/wiki-ingest/SKILL.md`** gained a "Smart tagging" guideline in Step 4, prompted by the real problem found during the Topics page work (196 unique tags, 126 single-use): check the existing vocabulary before inventing a tag, reason from four loose categories (Domain / Skill-Capability / Mechanism-Phenomenon / Format) rather than free-associating, and cap at 3–5 tags per page.
- **Recommended chip swap**: `RECOMMENDED_TOPICS` in `research.js` — "Risks of vibecoding in civic tech" replaced with "What is Critical AI Literacy?" (`concepts/critical-ai-literacy`). Note the v0.4.1 entry above still describes the original 6-topic set as it shipped then; this is the one topic that's since changed.

Files touched: `.claude/skills/wiki-ingest/SKILL.md`, `research.js`.

## Wikilink Alias Fix + Pre-Publish Verification Step (content/skill-doc only, 2026-10-10)

Prompted by the user asking "are the 5 Humanities concepts wikilinked?" — they were, but inspection turned up a real bug: `Close Reading.md` had `[[Critical AI Literacy|The Humanities Are the Moat]]`, a link whose display text named the source article but whose actual target was a different concept page. No `APP_VERSION` bump — vault content + skill-doc guidance only.

- **Fixed**: replaced the mismatched alias with plain italic `*The Humanities Are the Moat*` (no link) in the private vault file; re-ran the snapshot so `data/wiki-index.js` picks up the corrected body.
- **`.claude/skills/wiki-ingest/SKILL.md`**: added a "Smart wikilinking" guideline to Step 4 (use `[[Title]]` for a plain link; only use `[[Title|display]]` when `display` is an accurate label for that target; prefer no link or italic prose over a wrong alias) and a new **Step 9 — Verify tags and wikilinks before publishing**, run before either snapshot script: re-check every touched page's tags against the Step 4 rule, and `grep -o "\[\[[^]]*\]\]"` every touched page to confirm each alias/target is accurate and resolves to a real page. The former Step 9 (offer to refresh the deployed app's corpus) is renumbered to Step 10; two stale "(Step 9)" cross-references inside Step 4's full-article section were corrected to "(Step 10)".

Files touched: `.claude/skills/wiki-ingest/SKILL.md`, `data/wiki-index.js`.

## v0.5.6 — Related Articles Tightened to Real Wikilink Connections (2026-10-10)

`findRelated(doc)` previously scored "related" by tag overlap and type match alone, which surfaced coincidental matches with no real connection (e.g. "Critical AI Literacy" pulled in 82 loosely tag-matched docs, including things like "Workshop Hosting and Facilitation"). Prompted by the user asking to tighten this to actual `[[wikilink]]` connections. Scoped deliberately to only the Related Articles screen and the Ask flow's 3 follow-up topic chips — `search()` and the Ask flow's Sources chip are unchanged, since those answer a typed query rather than browse relationships.

- **New symmetric wikilink adjacency map** built once at init alongside `titleIndex`/`docById`, reusing the existing `[[Target\|alias]]` extraction pattern from `renderInline()`. A→B and B→A both count as "related," regardless of which page authored the link.
- **`findRelated(doc)` rewritten**: if a doc has any wikilink-connected pages, the result set is *only* those (ranked by the existing tag/type score as a tiebreaker). The one doc in the corpus with zero real wikilink connections (`The Humanities Are the Moat`, the full-article page) falls back to the old tag-overlap scoring, so the feature never goes empty.
- Verified against the real 101-doc corpus: "Critical AI Literacy" went from 82 tag-matched results down to its 5 actual wikilinked pages; the zero-link full-article page still returns 5 tag-fallback results instead of an empty state.

Files touched: `research.js`.

## Wiki-Unpublish Skill — tag-traced batch unpublishing (content/skill-doc only, 2026-10-10)

Mirror image of `wiki-ingest`: that skill only adds/appends, this one only removes a page from publication — by moving it, never deleting it, consistent with the project's standing "never delete" rule. No `APP_VERSION` bump — new skill file + spec doc updates only, no `research.js` changes needed.

- **New zone: `wiki/unpublish/`** — a flat folder, sibling to `wiki/concepts`/`entities`/`projects`/`articles`, holding pages removed from publication. Automatically invisible to `scripts/snapshot-wiki.mjs`'s export with zero script changes, since `unpublish` isn't one of the four zone names its `ZONES` constant scans — a moved page just stops appearing in the next `data/wiki-index.js` snapshot. The app's existing unresolved-wikilink rendering (`renderInline()` in `research.js`) already degrades gracefully for any page that still links to something now removed, so no app code needed there either.
- **New skill `.claude/skills/wiki-unpublish/SKILL.md`** (separate file, `wiki-ingest/SKILL.md` untouched): select targets by tag (batch) or explicit title(s); always traces every other page still linking to a target before presenting a plan, so nothing breaks silently; stamps moved pages with `unpublishedFrom`/`unpublishedDate`/`unpublishedReason` for a correct, traceable re-publish later; same "present a plan, wait for approval" governance as `wiki-ingest`.
- **`.gitignore`**: added `!.claude/skills/wiki-unpublish` alongside the existing `wiki-ingest` carve-out, so this skill commits to the public repo too.
- **`spec/WIKI_INGEST_SPEC.md`**: added the `wiki/unpublish/` row to the zone table.

Files touched: `.claude/skills/wiki-unpublish/SKILL.md` (new, committed), `.gitignore`, `spec/WIKI_INGEST_SPEC.md`.

## First Real Wiki-Unpublish Run — 20-Page Conversational-Design Cluster (content only, 2026-10-11)

First live use of the new `wiki-unpublish` skill, to keep the wiki's theme focused on Accountable AI research rather than general chatbot/conversational-design UX. No `APP_VERSION` bump — vault content only, `data/wiki-index.js` regenerated from the smaller corpus.

- **Selected by tag**: `design-canvas`, `voice-ui`, `vui` matched 20 concept pages — well over the `>5 docs` bulk-operation threshold, called out explicitly before moving anything.
- **Traced the blast radius**: found 8 pages outside the candidate set with real `[[wikilink]]`s in, split into two groups by review — 6 same-theme hub pages (`Design Canvas`, `Scenario-Based Design`, the `Project Athena` project page, `Conversation Flow - Three Act Patterns`, `Bot Introduction Design`, `Civic Tech`) got their 57 now-dangling links stripped to plain italic (same "no link over a wrong one" pattern as the earlier Close Reading alias fix); `Civic AI` and `Krizia Fernando` were kept untouched per explicit instruction, so their `[[Conversational Design]]` links now render via the app's existing unresolved-wikilink style.
- **Moved** all 20 pages from `wiki/concepts/` to `wiki/unpublish/`, each stamped `unpublishedFrom: concepts`, `unpublishedDate: 2026-10-11`, and a reason note.
- **Verified**: `node --check research.js` passes; none of the 20 titles leaked into the regenerated `data/wiki-index.js` (101 → 81 docs); `Design Canvas` still exports; `Civic AI`'s unresolved link confirmed present as expected.

Files touched: `data/wiki-index.js`.

## v0.5.7 — Search Autocomplete for the Ask Bar (2026-10-11)

Built the type-ahead idea logged in `spec/PHASE2_PLAN.md`, following its design reference (a Google-style "Ask anything" bar) with the two explicit deviations the user called out: only the clear ("×") icon, no mic or "+" icon.

- **Matching reuses `search()`** (`research.js`) as-is — no second matcher. The dropdown takes the top 6 of whatever `search()` already returns, ranked by its existing title/tags/type/body scoring.
- **New `#rw-autocomplete` dropdown** under the search pill (`index.html`, wrapped in a new `.rw-search-wrap` for positioning), one row per match with the same `.rw-type-dot` already used in the Sources chip — no new icon system.
- **New `#rw-clear-input` button**, shown only once the field has text; clears the input, closes the dropdown, refocuses.
- **Keyboard support**: ArrowUp/Down move a highlighted row (clamped at the ends), Enter selects the highlighted row if the dropdown is open (otherwise falls through to the existing submit-whatever-is-typed behavior), Escape closes the dropdown without clearing typed text. Outside-click closes it too, mirroring the existing hamburger-menu dropdown's own outside-click pattern.
- **Bug found and fixed while testing this**: clicking "Back" from an Ask answer back to the home/search screen left the previous question sitting in the input instead of clearing it (pre-existing, unrelated to this feature — just surfaced by testing it). Fixed in `goBack()`'s empty-stack branch, alongside the two other "reset to home" spots (`New question`, the hamburger menu's Home action) that already did this correctly.
- **Verified live in-browser** (not just `node --check`): typed a query, saw ranked matches with type-dots, arrow-key navigation + Enter selection worked, clear icon appeared/cleared correctly, outside-click closed the dropdown without submitting, and Back now returns to a genuinely empty input.

Files touched: `index.html`, `research.css`, `research.js`.

## v0.5.8 — Fix White Body-Margin Gap (2026-10-11)

User asked why there was white padding around the site. `research.css` only ever styled `#research-app` (background `var(--rw-ground)`, `min-height:100vh`) and never touched `html`/`body` — the browser's default user-agent stylesheet gives `body` its own `8px` margin, and since `body`'s background was left at the default white, that unstyled margin showed through as a white border around the app's actual mint-green background. Pre-existing since the app's first version; just not visually obvious until now.

- Added `html, body{ margin:0; padding:0; }` once, at the top of `research.css`, ahead of the `#research-app` block. `#research-app` is `body`'s sole direct child and already stretches full-width/`min-height:100vh`, so removing the margin alone closes the gap on all sides — no need to duplicate the `--rw-ground` color onto `body` itself.
- Verified live in-browser: background now fills edge-to-edge.

Files touched: `research.css`.

## v0.5.9 — Hash-Based Page Routing + Page-View Tracking Hook (2026-10-11)

User asked to plan page routing to track page views across nav item pages (Topics, Ingest Log, home), Ask Wiki results, and source document pages. Previously the app never changed the URL at all — navigation was purely in-memory via the existing `stack` array and `showScreen()`. Scoped explicitly to routing + a local tracking hook, not a third-party analytics script (confirmed with the user before building).

- **Hash routing, not `pushState`**: chosen because this is a static site with no build step and no locked-in host yet (per `PHASE2_PLAN.md`) — a `#/...` fragment needs zero server-side SPA-fallback configuration, unlike `pushState`, so it works identically on any static host.
- **Routes**: `` (home), `#/topics`, `#/ingest-log`, `#/ask?q=<query>&pin=<id>`, `#/article/<id>`, `#/related/<id>` — `routeFor()`/`parseRoute()` serialize/deserialize these from the same `{screen, query?, id?, pinnedId?}` shape the `stack` already used.
- **`trackPageView(entry)`**: the single hook point — logs to console and appends to a capped (200) `localStorage['rw-pageviews']` array. No real analytics service wired in; swapping one in later means editing this one function.
- **`setRoute(entry)`** updates the hash (skipping no-op calls) and tracks a view; wired into every existing forward-navigation call site (`askQuery`, `showRelated`, `showTopics`, `showIngestLog`, and `openArticle` when `pushToStack` is true) — same places that already mutated `stack`, no new call sites invented.
- **`goBack()` simplified**: its render-reconstruction logic was factored out into a reusable `renderFromRouteEntry()`, now also used by a new `hashchange` listener (handles real browser Back/Forward button presses — previously a no-op, now actually re-renders the matching screen) and by initial-load deep-link handling. A `suppressNextHashChange` flag stops our own `setRoute` calls from being double-processed by that listener.
- **Deliberately out of scope**: the inline preview panes (`openPreview`/`openAskPreview`) stay untracked — they're a peek, not a full page view.
- **Verified live in-browser**, not just `node --check`: hash updated correctly across Topics → an article → its Related Articles; `localStorage['rw-pageviews']` showed exactly one entry per navigation; native Back/Forward buttons now actually change the visible screen and log exactly one view per press; a fresh tab opened directly to an `#/article/...` URL deep-linked correctly; clicking a wikilink's inline preview confirmed to leave the hash and page-view log untouched.

Files touched: `research.js`.

## v0.6.0 — Graph View (Tier 1 static force-directed layout) (2026-10-28)

Added a new "Graph View" screen (hamburger menu → Graph View) showing all ~108 corpus documents as nodes connected by their real `[[wikilink]]` adjacency (reusing the existing `wikilinkGraph`), laid out once via a hand-rolled Fruchterman-Reingold force simulation — no D3 dependency, confirmed with the user that at this node count a CDN library would add network weight with no runtime benefit.

- **Single gray node color, degree-based sizing**: user explicitly rejected per-type (concept/entity/project/full-article) node coloring in favor of one flat gray (`#58544e`), with circle radius `3 + degree/5` so heavily-linked hub pages (e.g. the knowledge-hub synthesis docs) read as visually larger without needing a legend.
- **Labels hidden until hover**: node titles render as `<text>` labels with `opacity:0` by default, toggled to a `.visible` class only on hover — keeps the layout legible at a glance instead of a label soup.
- **Hover-to-highlight neighbors**: hovering a node adds `.active` (indigo `#7b68ee` fill) to that node, leaves direct neighbors visually unchanged, and fades (`.faded`) everything else; connected edges get `.highlighted` (indigo stroke) via `data-source`/`data-target` attributes set at edge-creation time — an earlier version inferred edge connectivity by comparing `x1`/`x2` coordinate strings against circle `cx` values, which was fragile and occasionally mismatched; switched to explicit id attributes instead.
- **Pan + zoom**: drag-to-pan and scroll-to-zoom (clamped 0.3×–3×) via a CSS transform on a `#rw-graph-viewport` group, plus explicit +/− zoom buttons and a live percentage readout in the subbar so the view has a discoverable, default-100% zoom control rather than relying solely on the scroll wheel.
- **No `viewBox`**: the SVG uses explicit `width`/`height` attributes rather than a `viewBox`, after `viewBox` was found to interact badly with the transform-based pan/zoom and freeze the simulated layout's apparent motion.
- Iterated on the Fruchterman-Reingold parameters (`k *= 1.2`, attraction divisor `k*1.8`, center gravity `0.005`, 300 iterations) to fix initial node clustering that was too tight.

Files touched: `index.html`, `research.css`, `research.js`.

## v0.7.0 — Graph View Rewritten as a 3D Globe (Canvas2D) (2026-10-28)

User said the flat 2D layout "feels scattered" and asked for a 3D-globe look like Obsidian's 3D graph view — depth cues (near nodes bigger/brighter, far nodes smaller/dimmer, true occlusion) and the ability to rotate the cluster like a trackball. Scoped via two explicit decisions in plan mode: **Canvas2D rewrite** (not SVG — true z-depth sorting/occlusion needs painter's-algorithm redraws, which can't cheaply re-stack 100+ SVG DOM nodes every drag) and **static layout, drag-to-rotate only** (no autorotation/`requestAnimationFrame` loop — preserves the "Tier 1 = static, no continuous physics" commitment from v0.6.0; redraws only happen reactively on drag/zoom/hover).

- **`layoutGraphFR()` extended to 3D**: nodes gain `z`/`vz`; repulsion, spring attraction, and center gravity all operate in three dimensions, producing a roughly spherical cluster around the origin (no explicit "project onto a sphere surface" step — repulsion + center gravity naturally fills a ball, same principle real 3D force-graph tools use).
- **Layout instability bug found via live testing**: the first version's debug output showed `boundingRadius: 17547` against a `spread` of only `718` — a ~24x blowup, with the average node position also drifting far off-origin (not just one outlier). The old SVG renderer never surfaced this: an exploded node just drew off-screen and was invisible. The new Canvas renderer derives its camera framing from `boundingRadius`, so the bug became visible immediately as a heavily off-center globe. Fixed with stronger velocity damping (`0.99` → `0.9` per iteration) plus a defensive post-layout radial clamp (`spread * 1.3`) that rescales any node that still escapes the cluster back toward the origin — belt-and-suspenders so the camera framing stays sane even if the physics parameters ever need retuning again.
- **Perspective camera**: `rotationX`/`rotationY` state (pitch clamped to ±1.45 rad to avoid gimbal flip), fixed focal length derived from the layout's bounding radius. Each draw, every node rotates by the camera angles and projects with `scale = focalLength / (cameraDistance - z)` — nearer nodes get bigger radius and higher opacity, farther nodes shrink and fade.
- **`index.html`**: `<svg id="rw-graph-svg">` replaced with `<canvas id="rw-graph-canvas">` inside the same screen wrapper; back button, legend, and the v0.6.0 zoom controls keep their ids/markup unchanged.
- **Hover/click are now manual hit-testing**, not DOM events: `mousemove` finds the nearest projected node within its on-screen radius (floor of 7px so small/far nodes stay clickable) and tracks `hoveredId` in JS state, redrawing on change. Reuses the same `wikilinkGraph`-based neighbor lookup as before — now expressed as canvas fill/alpha choices in `drawGraph()` instead of CSS classes.
- **Drag changed from pan to rotate**: `mousedown` + `mousemove` deltas update `rotationX`/`rotationY` (sensitivity `0.006` rad/px); `mouseup` with total drag distance under the threshold is treated as a click and opens the hovered article via `openArticle()`, same as before.
- **Theme colors resolved via `getComputedStyle`** once per screen entry (`--rw-ground`/`--rw-line`/`--rw-muted`), since Canvas paints pixels directly and can't inherit CSS custom properties, plus a `prefers-color-scheme` change listener that re-resolves and redraws so the globe doesn't go stale if the OS theme flips while it's open. The graph-specific colors that were never theme-tokens (base gray, active indigo, faded, highlighted-edge — unchanged values from v0.6.0) moved to plain JS constants.
- **`research.css`**: deleted the now-dead `#rw-graph-svg .rw-graph-node/.rw-graph-edge/.rw-graph-label` rule block (nothing is SVG DOM anymore); added minimal `#rw-graph-canvas` sizing/cursor rules in its place.
- **Verified live in a browser** (not just `node --check`): confirmed depth-varied node sizing/opacity, drag-to-rotate reshaping the visible cluster, hover hit-testing finding the correct node and highlighting its real `wikilinkGraph` neighbors, zoom buttons scaling the globe while keeping hit-testing accurate post-zoom, click-to-open navigating to the right article, and Back returning to the graph screen with camera state intact.

Files touched: `index.html`, `research.css`, `research.js`.

