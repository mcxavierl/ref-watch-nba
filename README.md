# Ref Watch NBA

Referee crew analytics for NBA bettors — **Raptors- and Lakers-aware**, free nightly slate, crew O/U and foul tilt at a glance.

## Quick start

```bash
npm install
npm run build-ref-data   # fetch tonight's assignments + build ref stats cache
npm run dev              # http://localhost:3000
```

## Data pipeline

| Script | Output | Source |
|--------|--------|--------|
| `npm run fetch-assignments` | `data/assignments.json` | [official.nba.com/referee-assignments](https://official.nba.com/referee-assignments/) (HTML parse) |
| `npm run build-ref-data` | `data/assignments.json` + `data/ref-stats.json` | Assignments (live) + NBA Stats API backfill |

### Historical ref stats (`build-ref-data`)

1. Pulls game IDs from `stats.nba.com` `leaguegamefinder` for **2023-24** and **2024-25** regular seasons.
2. For each game: `boxscoresummaryv2` (officials) + `boxscoretraditionalv2` (points, fouls).
3. Aggregates per-ref metrics with **30+ game minimum**.
4. If the Stats API is blocked or returns insufficient data, falls back to `data/ref-stats.seed.json`.

Re-run before tip-off on game nights:

```bash
npm run build-ref-data
```

## Pages

- `/` — Tonight's NBA slate with crew composite metrics and O/U traffic-light lean
- `/raptors` — Toronto Raptors splits by referee crew (foul split, home/away record, pace vs league)
- `/lakers` — Los Angeles Lakers splits by referee crew (same metrics as Raptors page)
- `/refs/[slug]` — Individual ref profile (e.g. `/refs/scott-foster-48`)

## Methodology (MVP)

- **Avg total points** — mean combined score in games the ref worked
- **Over rate** — games finishing above **225** fixed baseline (closing-line proxy when unavailable)
- **Avg fouls** — combined personal fouls from both teams per game (whistle-pace proxy)
- **O/U lean** — over if over rate ≥56% or total delta ≥+3; under if ≤44% or ≤−3
- **Raptors foul split** — avg PF on TOR vs opponent per game; differential ≥+1.5 flags TOR foul lean
- **Lakers foul split** — same methodology for LAL games by crew
- **ATS home cover** — skipped in v1 (no closing spread feed); noted in UI

## Verification

```bash
npm run typecheck
npm run build
```

## Limitations

- **Assignments** are live from official.nba.com when the page lists NBA games (empty during offseason).
- **Ref stats** may be **seeded** if `stats.nba.com` blocks your network (common on some cloud/VPN IPs). Re-run `build-ref-data` from a residential network for live backfill.
- **No closing lines** — over rate uses 225 baseline, not sportsbook totals.
- **No ATS** in v1 — home cover rate requires historical spread data.
- Not affiliated with the NBA. For entertainment/information only — see footer disclaimer.

## Stack

Next.js 15 · TypeScript · Tailwind CSS · App Router · JSON file cache (no database)
