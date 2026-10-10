# Phase 2 Plan — Civic Tech Research Portal

Status: **scoping/planning — nothing in this doc is built yet.** Phase 1 (MVP1 Search/Retrieve/View Article through v0.4.1) is complete and documented in [`PHASE1_PLAN.md`](./PHASE1_PLAN.md).

This doc collects everything Phase 1 explicitly deferred to "Phase 2 scoping," plus newer planning that's accumulated since.

## Carried over from Phase 1 scoping

**Still open:**
- **Off-topic content in the corpus**: `wiki/projects/Page-Blueprint-Skills.md` is about a Figma/Cursor page-builder skill, not civic tech — confirms `wiki/projects/` isn't guaranteed single-topic. Categorization/filtering needs to handle (or exclude) non-civic-tech entries rather than assume the whole corpus fits the theme.
- Whether to also ingest `wiki/index.md` (agent-maintained global index) as a browsable entry point, or treat it purely as a crawl aid.
- Whether `sources:` wikilinks (pointing into `raw/clippings`, `raw/papers`, etc., which live outside `wiki/`) should be resolved so a topic document can link back to its original source note, or whether the portal only ever surfaces the `wiki/` layer itself.
- Whether the ~89-file `wiki/` corpus is loaded by filesystem read (static export, e.g. a build step copying into `public/`) vs. some live local file access — no git remote exists on the Obsidian side yet, so "Document Store from GitHub repo" per the original flowchart isn't literal today.

**Not yet decided:**
- Whether "Document Store from GitHub repo" means live GitHub API reads/writes (needs auth + backend) vs. a build-time export of the vault into the repo's `public/`-style static files.
- Metrics tile design for Total Files / Total Topics / Avg Files per Topic (likely replaces the currently-hidden Content Chunks/Queries/Avg Response/Accuracy metrics section from the original `Marketing-RAG-Dashboard` prototype).
- Ingest (upload/paste → parse → categorize → save) and Analyze (metrics dashboard) have no implementation yet — no ingest UI exists in the repo. Current corpus loading stays a manual one-off (`scripts/snapshot-wiki.mjs`), not a repeatable/live pipeline.

## Login / User Accounts (not yet built, 2026-10-10)

Goal confirmed with the user: **real individual user accounts** (not a shared-password gate) — so future personalization/usage tracking per person is possible, not just keeping the site private. Production host isn't locked in yet: a Netlify account exists but moving to it is explicitly deferred — for now this still needs to work as a pure static site (GitHub Pages-compatible, no backend), matching how `index.html`/`research.css`/`research.js`/`data/wiki-index.js` are built today (no `package.json`, no build step).

**Recommended provider: [Clerk](https://clerk.com).** Reasoning:
- No backend required to start — Clerk's hosted sign-in UI and session verification happen on Clerk's side; the static site only needs a publishable key (safe to expose client-side).
- Ships a plain `<script data-clerk-publishable-key="...">` loader for no-build-step projects — fits this repo's existing "just `<script src="research.js">`" pattern without introducing npm/a bundler just for auth.
- Prebuilt `<SignIn>`/`<UserButton>` components (not hand-built forms) — the "fast" part of "best and reliable 3rd party tool, fast."
- Free tier covers 10,000 monthly active users.
- Clean path to the eventual Netlify move: Clerk's Node SDK + a Netlify Function can verify session tokens server-side later, once there's an actual backend/API to protect (e.g. server-stored data instead of today's `localStorage` recent-search history) — nothing here needs to be redone for that, it's additive.

Alternatives considered, not chosen for v1: **Auth0** (more enterprise/battle-tested, also needs no backend via hosted Universal Login, but more setup ceremony than Clerk's prebuilt components); **Supabase Auth** (worth revisiting specifically if/when a real database gets added behind accounts, since it bundles Postgres + Auth — a bigger change than "add login," so deferred).

**Implementation outline (not yet started):**
1. User creates a free Clerk account + application, grabs the Publishable Key (no Secret Key needed yet — no backend).
2. `index.html`: add Clerk's vanilla-JS loader `<script>` in `<head>`; add topbar mount point for `<div id="clerk-user-button">` and a full-screen `<div id="clerk-sign-in">` gate.
3. New `auth.js` (separate from `research.js`): `Clerk.load()`, show the sign-in gate and hide `#research-app` when signed out; mount `<UserButton>` and reveal the app when signed in — `research.js`'s current unconditional `wire();` call at the bottom of the file becomes conditional on an auth-ready signal instead of firing at script-load time.
4. `research.css`: a themed `.rw-auth-gate` wrapper using the existing `--rw-*` tokens (via Clerk's `appearance` theming option, not its default look) plus minor topbar spacing for the `UserButton`.
5. Explicitly out of scope for that first pass: migrating hosting to Netlify itself, any server-side/API work, and namespacing today's `localStorage` recent-search history per signed-in user (a reasonable small follow-up once accounts exist).
