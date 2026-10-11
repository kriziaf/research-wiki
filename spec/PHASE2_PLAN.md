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

## Wiki-Ingest Skill — local vault tool (built, 2026-10-10)

**Not the in-app Ingest UI.** The original flowchart's "Ingest Documents → Input Method (Upload Files | Paste Text) → Save to Research Repository" is still unbuilt in the deployed app — that remains open Phase 2 scope. What got built instead is a separate, local **Claude Code skill** (`.claude/skills/wiki-ingest/SKILL.md`) that operates directly on the user's own Obsidian vault filesystem, mirroring the personal `wiki-ingest` command referenced in `spec/WIKI_INGEST_SPEC.md` (which lives on a different local machine account entirely and is intentionally not part of this repo) — but built generic/shareable so anyone cloning `research-wiki` can point it at their own vault.

- **No personal paths in committed code.** All filesystem locations (vault root, source/clippings folders to search) live in `.claude/wiki-ingest.local.json`, gitignored via a scoped `.gitignore` carve-out (`.claude/*` stays ignored generally — matches the earlier decision to keep `build-remote`/`build-spec` local-only — with `!.claude/skills/wiki-ingest` un-ignoring just this one skill folder). The skill creates that config interactively on first use if it's missing.
- **Workflow**: search configured source folders for a candidate file by title → disambiguate if multiple match → analyze for candidate concepts/entities → **present a full write plan and stop, waiting for explicit approval** (governance rule carried over from `WIKI_INGEST_SPEC.md` — never skipped) → on approval, copy the raw source into `vaultRoot/raw/clippings/YYYY-MM-DD-slug.md` and create/append `vaultRoot/wiki/<zone>/<Title>.md` pages with the full frontmatter contract, appending rather than overwriting any page that already exists.
- **`scripts/snapshot-wiki.mjs` fixed as part of this work**: it previously hardcoded the vault path directly (`/Users/krizfernux/Obsidian Vault/ant-colony/wiki-site/wiki`) despite being committed to the public repo — the exact problem this whole change was meant to avoid. It now reads `vaultRoot` from the same `.claude/wiki-ingest.local.json`, falling back to the old hardcoded value only if that config doesn't exist yet, so existing checkouts don't break.
- Tested end-to-end against a real case this session: searching "humanities are the moat" across the two configured source folders correctly found two near-duplicate candidates in Clippings, none in Backup, and confirmed the title wasn't already in `data/wiki-index.js`.

Files touched: `.gitignore`, `.claude/skills/wiki-ingest/SKILL.md` (new, committed), `.claude/wiki-ingest.local.json` (new, gitignored — not in the repo), `scripts/snapshot-wiki.mjs`.

## Surface Original Article + Author Credit — built via the full-article type (2026-10-10)

Originally parked here as a generic "add citations to every doc" task. **Superseded by a narrower, concrete design** (see `spec/PHASE1_PLAN.md`'s dated version entry for the actual build): rather than retroactively normalizing the 28 existing raw clippings' inconsistent frontmatter schemas (real complication found at the time — some use singular `source:`/`author:`, others plural `sources:`/`authors:` plus an `organization:` field no shape elsewhere has), new ingests can opt into a dedicated `type: full-article` page (`wiki/articles/<Title>.md`) carrying clean `sourceUrl:`/`sourceAuthor:` frontmatter from the start.

**Copyright boundary, decided explicitly with the user**: the full article text itself stays **private-vault-only** (`wiki/articles/`, never committed to this repo). `scripts/snapshot-wiki.mjs` exports only a short excerpt + `sourceUrl`/`sourceAuthor` for this type — the public app/repo never carries a full reproduction of externally-sourced copyrighted text, only a credited excerpt and a "Read full article →" link to the real source.

**Not done by this pass**: retroactively adding `sourceUrl`/`sourceAuthor` to the 98 existing concept/entity pages, or normalizing the legacy raw-clipping schema inconsistency — both stay genuinely deferred/optional if wanted later.

Recurring vault-maintenance ideas (not one-off features) now live in [`OPTIMIZATION_TASK_LOG.md`](./OPTIMIZATION_TASK_LOG.md) — see the Tag Category Review Skill entry there.
