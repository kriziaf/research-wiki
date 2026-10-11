# Optimization Task Log — Civic Tech Research Portal

A running list of **recurring, periodic maintenance ideas** — things a human (or a Claude Code skill) would run on a cadence, not a one-off feature to build and ship. This is distinct from [`PHASE2_PLAN.md`](./PHASE2_PLAN.md)/[`PHASE3_PLAN.md`](./PHASE3_PLAN.md), which track features still to be built; entries here are about keeping an already-built system healthy over time (vault hygiene, corpus drift, link rot) as the wiki keeps growing.

Each entry: what it checks, why it matters, suggested cadence, and build status.

## Tag Category Review Skill (idea, not yet built, 2026-10-10)

**What**: a vault-wide, read-only audit — scan every page's `tags:` list across the whole corpus, group by the four Smart Tagging categories (Domain / Skill-Capability / Mechanism-Phenomenon / Format) from `wiki-ingest`'s Step 4 guideline, and flag likely duplicates/near-synonyms plus tags that have fallen below a reuse threshold.

**Why**: `wiki-ingest`'s Smart Tagging guideline only governs tags at ingest time — it can't catch drift that accumulates afterward (a tag reused correctly when it was added, but that's since split into near-synonyms across later ingests; or a tag quietly going single-use again as surrounding pages get edited). This closes that gap as a periodic sweep rather than a write-time check.

**Cadence**: suggested weekly, run on demand (not automated/scheduled yet).

**Status**: not built. Complements, doesn't replace, `wiki-ingest`'s per-page tagging guidance — that stays the write-time check; this would be the periodic audit.

**Open question**: run it as its own standalone skill, or fold it into `wiki-ingest` Step 9's pre-publish verification as an optional broader sweep.
