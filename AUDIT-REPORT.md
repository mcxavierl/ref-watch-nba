# Ref Watch Audit Report

**Date:** July 6, 2026  
**Scope:** NBA + NHL home slates, navigation, feeds, offseason, monetization hooks  
**Prior work referenced:** provenance layer (9dc926f), NHL ref links (66194cd), uncommitted P1/P2 sprint (offseason, edge summary, feed routes)

---

## A. Functionality Opportunities

### Findings
- **Feed routes:** Old `/feed/nba.json` and `.xml` paths broke on static segment rules — fixed with `/feed/{league}/json|rss` plus redirects/rewrites in `next.config.ts`.
- **Offseason detection:** Both leagues have empty assignment files; home pages now branch to offseason UI instead of showing empty slate sections.
- **Anchor links:** `TonightEdgeSummary` links to `#game-{id}`; game cards expose matching `id` and `scroll-mt-24`.
- **NHL parity:** Game cards use `basePath="/nhl"` for ref/team links; NHL findings use `/nhl/teams/` paths. `HomeBiasCard` in `WhistlePremiumSection` now accepts `basePath` for future NHL alert sections.
- **SEO/feeds:** RSS alternates in layout metadata; JSON-LD on slate pages; sitemap covers both leagues.

### Remaining / deferred
- **Grudge-match storylines on NHL slate:** `grudge-match.ts` is NBA-data-only; NHL home page does not pass storylines to edge summary (NHL-specific grudge logic deferred).
- **Live odds:** Requires `ODDS_API_KEY` + fetch scripts — proxy benchmarks used when absent (documented in methodology).
- **Ref search on mobile:** Ref list pages have search but no global search — deferred (low traffic surface).

---

## B. UX Opportunities

### Findings
- **Signal-first hierarchy:** `TonightEdgeSummary` ranks top 5 edges above game cards; game cards lead with pace alert badge + points/goals above average, then scoring/whistle detail.
- **15-second scan:** Bold headings, plain-language labels via `user-language.ts`, confidence tiers instead of internal sample-quality jargon.
- **Mobile nav:** League toggle + section links stack vertically on small screens; secondary links expand full-width.
- **Offseason:** Dedicated notice with browse CTAs and season-notify hook instead of empty game list.
- **Dev copy removal:** `npm run …` hints stripped from user-facing empty states and meta notes via `userFacingDataNote()`.

### Implemented
- Reordered game card metrics (signal → evidence).
- Offseason empty-state copy on team pages without CLI instructions.
- Historical over lean badge uses plain “OVER / UNDER / NEUTRAL” labels.

---

## C. Impeccable Delight Opportunities

### Findings (product register — pre-game research tool)
- **Copy feedback:** Share bar shows “Copied” / “Link copied” with success styling and `aria-live`.
- **Focus states:** Edge summary links, ref chips, buttons use visible `focus-visible` outlines.
- **Reduced motion:** Global `prefers-reduced-motion` rule; pro preview blur degrades to opacity; header whistle hover disabled under reduced motion.
- **Empty states that teach:** Offseason notice explains what to do next; edge summary empty message points to findings.
- **No glassmorphism / gradient text:** Avoided per impeccable bans.

### Implemented
- `btn-secondary` with subtle active press (scale) respecting reduced motion.
- Pro tease uses blurred preview panel (usability: shows what Pro adds, not decoration).
- Header whistle micro-interaction retained with `motion-reduce` guard.

---

## D. Monetization Opportunities (free-tier hooks only)

### Findings
- **No Stripe/payments** — hooks and honest copy only, per roadmap.
- **Season-start notify:** `mailto:hello@refwatch.ca` CTAs in offseason notice + footer.
- **Pro waitlist:** `ProComingSoonTease` with blurred preview + waitlist mailto in methodology and live slates.
- **Affiliate-free positioning:** Footer explicitly states no sportsbook affiliate links.
- **Share virality:** Share bar adds copy-summary, copy-link, and native share.
- **Methodology trust:** Sample gates, provenance markers, ConnexOntario disclaimer — foundation for future conversion.

### Deferred
- **Email capture form / backend:** Mailto placeholders until transactional email service is wired.
- **Paid Pro tier:** Waitlist only; no feature gating or payments.

---

## Implementation Summary

| Item | Status |
|------|--------|
| Feed route fix + redirects | Done |
| Offseason mode + notice | Done |
| Tonight's Edge Summary | Done |
| Game card scan hierarchy | Done |
| Mobile nav improvements | Done |
| Hide npm/dev copy | Done |
| Copy/share feedback | Done |
| Focus states + motion-reduce | Done |
| Season notify + Pro waitlist hooks | Done |
| Pro preview tease | Done |
| NHL HomeBias basePath | Done |

---

## Verification

Run before merge:

```bash
npm run typecheck && npm run build
```
