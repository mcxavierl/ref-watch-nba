# Ref Watch NBA

See how NBA referee crews affect scoring and fouls — for all 30 teams, with tonight's slate at a glance.

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

1. Pulls game IDs from `stats.nba.com` `leaguegamefinder` for **2023-24**, **2024-25**, and **2025-26** regular seasons.
2. For each game: `boxscoresummaryv2` (officials) + `boxscoretraditionalv2` (points, fouls).
3. Aggregates metrics for **every ref** who officiated a game and crew splits for **all 30 NBA teams**.
4. If the Stats API is blocked or returns insufficient data, falls back to `data/ref-stats.seed.json` (comprehensive simulated dataset).

Re-run before tip-off on game nights:

```bash
npm run build-ref-data
```

Regenerate comprehensive seed data (75 refs, 3 seasons, all teams):

```bash
npm run generate-ref-seed
```

Seed team splits for all 30 teams from existing TOR/LAL templates:

```bash
npx tsx scripts/expand-team-splits.ts
```

## Pages

- `/` — Tonight's NBA slate with crew scoring/foul trends and team links
- `/teams` — All 30 NBA teams with links to crew history
- `/teams/[abbr]` — Team crew splits (e.g. `/teams/TOR`, `/teams/BOS`)
- `/raptors` → redirects to `/teams/TOR` (backwards compat)
- `/lakers` → redirects to `/teams/LAL` (backwards compat)
- `/refs` — All referees in the dataset
- `/refs/[slug]` — Individual ref profile (e.g. `/refs/scott-foster-48`)

## Methodology (MVP)

- **Avg combined score** — mean total points in games the ref crew worked
- **Games over 225 pts** — share finishing above **225** fixed baseline (proxy when closing lines unavailable)
- **Fouls per game** — combined personal fouls from both teams (whistle-pace proxy)
- **Scoring trend** — higher if over rate ≥56% or total delta ≥+3; lower if ≤44% or ≤−3
- **Foul edge** — avg fouls on team vs opponent per game; ≥+1.5 flags team foul lean
- **ATS home cover** — skipped in v1 (no closing spread feed); noted in UI

## Verification

```bash
npm run typecheck
npm run lint
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
