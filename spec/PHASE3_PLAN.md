# Phase 3 Plan — Civic Tech Research Portal

Status: **Graph View is built and shipped** (see below) — everything else in this doc is still scoping/planning. Phase 1 (MVP1 through v0.5.0) is complete, documented in [`PHASE1_PLAN.md`](./PHASE1_PLAN.md). Phase 2 (Ingest/Analyze UI, Login/User Accounts, the built Wiki-Ingest skill, and the parked author-credit task) is documented separately in [`PHASE2_PLAN.md`](./PHASE2_PLAN.md) and stays scoped to that doc — Phase 3 is kept separate rather than folded in.

This doc collects larger, more exploratory features that go beyond Phase 2's scope.

## Graph View (Obsidian-style) — built, v0.6.0 through v0.8.0 (2026-10-28)

The level-of-effort estimate below (Tier 1/2/3, D3-vs-hand-rolled) was the original plan. What actually shipped deviated from it in two real ways, then iterated well past Tier 1 scope. Full dated build history, including what was tried, reverted, and why, lives in [`PHASE1_PLAN.md`](./PHASE1_PLAN.md)'s v0.6.0–v0.9.0 entries (search that file for "Graph View" / "3D globe" / "Elastic Node Dragging") — this section just summarizes where it landed.

- **Dependency choice reversed**: shipped **hand-rolled vanilla JS**, not D3. At ~108 nodes/~420 edges the dataset is too small for D3's performance case to matter, and the user preferred zero added network weight over the modest implementation-time savings.
- **Went past Tier 1 into Tier 2+ territory**, then further: a 3D-perspective "globe" rendering (rotation, depth occlusion, autorotation) was built on Canvas2D, then an Obsidian-reference screenshot prompted a full rewrite back to a flat 2D force-directed layout with collision/separation packing (closes the gaps charge-repulsion-alone leaves, for an evenly-tiled silhouette) — then reverted back to the 3D globe per explicit user request, since the user preferred the autorotation effect and felt the 2D version hadn't actually delivered the Obsidian feel they wanted. **Current shipped state (v0.8.0, reverted from v0.9.0 — commit `7cdd43b`): 3D perspective globe, autorotation, drag-to-rotate the camera, and Obsidian-style elastic node dragging** (grab a node, it and its connected neighbors displace like springs with edges visibly stretching, bouncy settle on release).
- Click a node → existing `openArticle()`. Hover-to-highlight neighbors (dim everything else) — the signature Obsidian interaction from the original Tier 2 scope — is in. Labels show on hover only, not always-on. Pan (click-drag empty space, now camera-rotate in the 3D version) + wheel/button zoom are in.
- **Entry point resolved**: a hamburger-menu "Graph View" item, alongside Ask Wiki / Search Topics / Log in.
- **A real bug was found and fixed, then reintroduced by the v0.9.0→v0.8.0 revert**: a large/fast node-drag could make the elastic spring simulation diverge instead of settle (confirmed via console instrumentation — kinetic energy exploding past 140,000 instead of decaying). Fixed with a per-tick speed clamp in the v0.9.0 2D rewrite; reverting back to v0.8.0 brought the unfixed version back since the revert was a clean rollback rather than a selective one. **Not yet re-applied** — worth porting the speed-clamp fix onto the current v0.8.0 code on its own, since it's an isolated, low-risk change that doesn't affect rotation/autorotation behavior.

### Not shipped / still open

- **Tier 3 items**: filter-by-tag, search-to-highlight, a "local graph" mode centered on the open article, and a decision on the dangling-wikilink ghost-node question below. None of these were built; the effort went into the 3D/2D rendering-approach exploration instead.
- **Dangling wikilinks**: whether to render ghost/ring nodes for links to titles not present in the corpus, or resolve them at the data layer by ingesting the missing source concepts (`wiki-ingest` skill, `spec/PHASE2_PLAN.md`) — still undecided, not implemented either way.
- **Tag-based "sphere of spheres" clustering**: a follow-on idea discussed but not built — grouping nodes into per-tag clusters that each form their own tight sub-layout, positioned near each other. Scoped and then deliberately split off from the elastic-drag work to keep them testable independently; not picked back up after the 2D-vs-3D direction question came up.
- **Mobile touch support and a performance pass** (both originally Tier 3 scope): not built.
