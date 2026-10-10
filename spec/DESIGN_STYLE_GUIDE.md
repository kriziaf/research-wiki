# Design Style Guide

## Approved direction (2026-10-10)

The component patterns below (search console → cited answer → split-pane source panel) were applied to the portal's actual subject matter — not a copy of the reference screenshots — in [`design-system-demo.html`](./design-system-demo.html). User-approved: the palette and typefaces are locked in as the portal's direction.

**Color** — forest-teal/paper, not the reference's orange:

| Token | Light | Dark | Role |
|---|---|---|---|
| `--ground` | `#F4F6F3` | `#10160F` | Page background |
| `--surface` | `#FFFFFF` | `#171F19` | Cards, inputs-on-focus, panel |
| `--surface-2` | `#EEF2EC` | `#1D2821` | Recommended-card fill, input idle fill |
| `--ink` | `#16211C` | `#E8EDE9` | Primary text |
| `--muted` | `#5C6B60` | `#A9B6AC` | Secondary text |
| `--accent` | `#27594A` | `#74C2A2` | Buttons, focus ring, active citation |
| `--accent-soft` | `#DCE8E1` | `#213A31` | Citation highlight wash, active chip hover |
| `--line` | `#DCE3DD` | `#283530` | Hairline borders |
| `--type-concept` / `--type-entity` / `--type-project` | `#2E7D64` / `#9C6B3F` / `#4E6E8C` | lighter equivalents | Small dots encoding frontmatter `type:` — semantic, not decorative |

**Type** — two roles:
- Display (headings only): `Space Grotesk` (loaded via Google Fonts, weight 700 — the only weight headings use), falling back to the system sans stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) if the web font fails to load. **Reverses the original "deliberately not Inter/Space Grotesk" decision** (below) — changed 2026-10-10 by explicit request. Originally `Iowan Old Style, "Palatino Linotype", Palatino, Georgia, serif`, chosen for "editorial/archival character for document titles"; that serif/sans-chrome contrast is gone now that both display and body are sans.
- Body + UI chrome: `Source Sans Pro` (loaded via Google Fonts as "Source Sans 3", its current distribution name — see `index.html`'s `<link>` tags), falling back to the system sans stack if the web font fails to load. Weights loaded: 400, 400 italic, 600, 700 (matches actual usage in `research.css`). Changed from the plain system stack 2026-10-10.

<sub>Original rationale, kept for history: "two roles, deliberately not Inter/Space Grotesk" — superseded by the Space Grotesk change above.</sub>
- Metadata/frontmatter (tags, dates, source paths): `ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace` — ties directly to the literal YAML frontmatter shape documented below, not a stylistic flourish.

Rationale for the palette: forest-teal echoes the "Smol Gardens" civic-tech-as-garden metaphor already present across the ingested wiki content (`Smol Gardens`, `Smol Gardens for Practitioners`, "bounded local stewards"), rather than inheriting the reference product's orange brand color.

---

## Reference screenshots (raw extraction, superseded by the above for color/type)

Extracted 2026-10-10 from three screenshots of a search/Q&A product (appears to be Reddit Answers — "Find what people are saying" header, subreddit source chips, Reddit avatar/snoo icon). Values below are read visually off the screenshots, not pulled from source CSS — treat hex codes as close approximations to verify against the real app before locking them in.

This is a strong reference for the Phase 1 portal's **Search & Retrieve** flow (`PHASE1_PLAN.md`): ask-a-question input → synthesized answer with inline citations → click a citation → split view with the original source document. That's almost exactly the flowchart's `Enter Search Query → Search Across Document Frontmatter → Return Matching Results → Display Retrieved Documents` path.

## Screens captured

1. **Home** — empty search state with Recent/Recommended query shortcuts.
2. **Answer view** — a submitted question, synthesized answer with cited bullet points, follow-up input.
3. **Split view** — same answer view, with a clicked citation opening the original source post + comment in a right-hand panel.

## Color palette (approximate)

| Role | Approx. value | Where used |
|---|---|---|
| Page background | `#FFFFFF` | All screens |
| Primary text | `#111111` – `#1A1A1A` (near-black) | Headlines, body, card titles |
| Secondary/muted text | `#6B7280`-ish gray | Timestamps, upvote counts, placeholder text |
| Brand accent | Orange-red, `#FF4500`-ish | Sparkle/hero icon, notification badge |
| Input background | Light blue-gray, `#DCE3EA`-ish | Ask-a-question / follow-up input fill |
| Input focus border | Muted blue, `#7FA6D1`-ish | Active state ring on the search input |
| Card border (Recent items) | Light gray, `#E5E7EB`-ish | 1px border on "Recent" shortcut cards |
| Card fill (Recommended items) | Light gray, `#F3F4F6`-ish | No-border "Recommended" shortcut cards |
| Citation link text | Standard link blue, `#2563EB`-ish | Inline quoted snippets inside answer bullets |
| Citation highlight (selected) | Light blue-gray wash, `#C7D5E3`-ish | Background behind the citation that's currently open in the split view |
| Icon-button fill | Light gray, `#F3F4F6`-ish | Back / edit circular buttons |
| Outline button | White fill, gray border, black text | "Go to Post" CTA |

## Typography

Clean grotesque sans-serif throughout (verify exact family in the live app — don't assume without checking). Observed scale:

| Level | Approx. size | Weight | Example |
|---|---|---|---|
| Hero headline | ~28–32px | Bold | "Find what people are saying" |
| Answer H3 | ~20–22px | Bold | "Setting Up SLM On A Mac Mini" |
| Section label | ~16–18px | Bold | "Recent", "Recommended" |
| Answer H4 | ~16–18px | Bold | "How Hard Is It Generally" |
| Body / bullets | ~15px | Regular, with bold lead-in clause | "**Memory is the big constraint.** _quoted source text_" |
| Meta text | ~13–14px | Regular | "13 days ago", "182 votes" |
| Input placeholder | ~16px | Regular | "Ask a question" |

A recurring pattern: **bold lead-in phrase + regular-weight supporting clause** inside each bullet, with the supporting clause rendered as a blue, citation-style inline link back to its source.

## Shape & spacing

- **Pill inputs**: very large border-radius (~20–24px), full-width, ~56–64px tall, with a right-aligned circular send-arrow button.
- **Cards**: ~12px border-radius, generous internal padding (~16–20px).
- **Grid**: Recent/Recommended shortcuts lay out as a responsive 2-column grid with ~12–16px gaps.
- **Icon buttons** (back, edit/compose, close): circular, ~40px, light-gray fill, black icon, no border.
- Generous vertical rhythm — sections separated by clear whitespace rather than dividers (except the thin top-nav border).
- **Article body rhythm** (`.rw-body` — article view, ask-flow answer preview): paragraph `margin-bottom` is set to match `line-height` exactly (both `1.65em` at the body's `0.95rem`), so the gap *between* paragraphs reads as one full blank line — never less than the leading *within* a paragraph. Fixed 2026-10-10 after a real bug: the gap had been a flat `14px` against a `1.65` line-height (~25px), so paragraphs were visually tighter than their own internal line spacing and read as one undifferentiated block. Headings (`h2`/`h3`/`h4`) use proportional `em`-based top margins (`1.7em`/`1.5em`/`1.3em`) for the same reason — scales with each heading's own font size rather than a flat px value, and collapses with the preceding paragraph's margin via normal CSS margin-collapse.

## Component inventory

1. **Top nav bar** — hamburger (left) · optional ad icon · chat icon · "+ Create" pill button · bell with red count badge · avatar with green online-status dot (right). Thin 1px bottom border, white background.
2. **Hero prompt block** — small accent icon (sparkle), bold centered headline, large pill input directly below.
3. **Shortcut card grid** — two variants:
   - *Recent*: white card, light border, clock icon, label, dismiss (×) icon.
   - *Recommended*: filled light-gray card, emoji icon, label, no dismiss.
4. **Section label row** — bold text + optional chevron (collapsible, as on "Recent").
5. **Conversation thread** — user question as a right-aligned rounded gray bubble; answer rendered full-width below it, not bubble-wrapped.
6. **Source attribution chip** — overlapping circular source-icons, "Sources: X, Y, Z +N more" text, trailing chevron; expands to the split view on click.
7. **Structured answer body** — H3 title, H4 subsections, bullet lists with bold lead-ins and inline blue citation quotes.
8. **Follow-up input** — same pill style as the hero input, pinned at the bottom of the answer view.
9. **Split-pane source panel** — opens on citation click, right-hand column with its own close (×):
   - Source header: subreddit/community icon, name, relative timestamp, author.
   - Post title (bold) + excerpt with "See more" expand.
   - Engagement meta ("113 upvotes · 68 comments").
   - Nested comment card (lighter gray, rounded) with its own avatar/author/timestamp/body/vote count and a "Go to comment" link.
   - Full-width outline **"Go to Post"** CTA pinned at the bottom of the panel.
10. **Active-citation highlight** — the specific bullet whose source is open in the split view gets a light blue-gray background wash, visually linking answer ↔ source.

## Interaction pattern worth porting

Clicking an inline citation doesn't navigate away — it opens a **split view** with the source document on the right while the answer stays visible and scrollable on the left, and the triggering citation gets highlighted. This is the cleanest available reference for the portal's "click a search result → see the source document without losing your place" need, and is more developed than anything currently specified in `PHASE1_PLAN.md`'s open question about "results list design."

## Not yet determined

- Exact font family/weights, precise hex values, and spacing tokens all need verification against the live product (or exported assets) rather than this visual read.
- Dark-mode variant not captured in these screenshots.
- Mobile/responsive behavior not captured — all three screenshots are desktop width.
