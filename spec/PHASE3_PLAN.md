# Phase 3 Plan — Civic Tech Research Portal

Status: **scoping/planning — nothing in this doc is built yet.** Phase 1 (MVP1 through v0.5.0) is complete, documented in [`PHASE1_PLAN.md`](./PHASE1_PLAN.md). Phase 2 (Ingest/Analyze UI, Login/User Accounts, the built Wiki-Ingest skill, and the parked author-credit task) is documented separately in [`PHASE2_PLAN.md`](./PHASE2_PLAN.md) and stays scoped to that doc — Phase 3 is kept separate rather than folded in.

This doc collects larger, more exploratory features that go beyond Phase 2's scope.

## Graph View (Obsidian-style) — not yet built, 2026-10-10

The user asked for a level-of-effort estimate for a graph visualization of the wiki corpus, similar to Obsidian's graph view — documents as nodes, `[[wikilinks]]` as edges. Recorded here as a planned Phase 3 feature rather than Phase 2, per explicit instruction to keep it separate from the Login feature.

**Real numbers, pulled from the actual corpus** (not estimated): 93 nodes, 385 unique undirected edges (deduped from 807 raw wikilink occurrences), 1 isolated node (no links in or out), and **105 dangling wikilinks** — links to titles not present in the corpus (raw source references, or concepts mentioned but not yet ingested as their own wiki page). Graph size itself is small by Obsidian standards (it routinely handles thousands of notes); the constraint is implementation effort, not scale.

### Effort estimate, by fidelity tier

**Tier 1 — Static graph, minimal (~half day, 3–5 hrs)**
Force-directed layout via D3's `d3-force` module, loaded from CDN (same no-build-step pattern already used for the Google Fonts `<script>` tags in `index.html`). Rendered as SVG, simulated once and frozen. Click a node → existing `openArticle()`. Color by type via the existing `--rw-type-concept/entity/project` tokens. Basic pan/zoom. New screen using the existing stack/nav pattern (same architecture as the Topics page).

**Tier 2 — Interactive, Obsidian-like (~1–1.5 days, 8–12 hrs) — recommended**
Adds: continuous gentle physics (nodes drift like real Obsidian rather than freezing), draggable nodes, hover-to-highlight (dim everything except the hovered node's neighbors — the signature Obsidian interaction), mouse-wheel zoom + drag-pan, labels that appear on hover/zoom-in rather than always-on (93 simultaneous labels would be cluttered), a small type-color legend.

**Tier 3 — Full polish (~2–3 days total, 16–24 hrs)**
Adds on top of Tier 2: filter-by-tag (reuse the Topics page's existing tag data/logic directly), search-to-highlight within the graph, a "local graph" mode (centered on the currently-open article, mirroring Obsidian's per-note mini-graph) alongside the full-vault view, a decision + implementation for the 105 dangling links (render as ghost/ring nodes vs. silently drop them), mobile touch support, a performance pass, and this spec entry updated to reflect what shipped.

### Key open decision

**Dependency choice**: pull in D3 (`d3-force` + `d3-zoom` via CDN, battle-tested, fast to integrate) vs. hand-roll the physics simulation in vanilla JS to stay fully dependency-free like the rest of the app's logic. Recommendation: **use D3** — this repo already isn't purist about zero dependencies (Google Fonts is an external load per `spec/DESIGN_STYLE_GUIDE.md`'s v0.4.3 typography entry), and hand-rolling force-directed layout well would itself consume most of Tier 1's estimated time.

**Recommended scope for a first pass: Tier 2.** Reads as genuinely "the Obsidian graph" rather than a token gesture, without the extra few days Tier 3's filtering/local-graph/mobile work adds. Tag-filtering and local-graph mode are natural Tier 3 follow-ons once Tier 2 validates the approach.

### Not yet decided

- Entry point: a new hamburger-menu item (alongside Ask Wiki / Search Topics / Log in, built in the dropdown-menu work this session) vs. a button on the Topics page vs. somewhere else.
- Whether dangling-wikilink ghost nodes are worth building at all, or whether resolving those 105 links by ingesting the missing source concepts (via the `wiki-ingest` skill, `spec/PHASE2_PLAN.md`) is the better fix — shrinks the dangling-link problem at the data layer instead of the UI layer.
