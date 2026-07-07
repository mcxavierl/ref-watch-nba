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
| `npm run fetch-odds` | `data/odds.json` | The Odds API totals + spreads (optional `ODDS_API_KEY`) |
| `npm run morning-slate` | assignments + odds + `data/alerts.json` | Morning refresh (~9:05 AM ET cron) |
| `npm run build-ref-data` | `data/assignments.json` + `data/ref-stats.json` | Assignments (live) + NBA Stats API backfill |

### Historical ref stats (`build-ref-data`)

1. Pulls game IDs from `stats.nba.com` `leaguegamefinder` for **2023-24**, **2024-25**, and **2025-26** regular seasons.
2. For each game: `boxscoresummaryv2` (officials) + `boxscoretraditionalv2` (points, fouls).
3. Aggregates metrics for **every ref** who officiated a game and crew splits for **all 30 NBA teams**.
4. If the Stats API is blocked or returns insufficient data, falls back to `data/ref-stats.seed.json` (comprehensive simulated dataset).

Re-run before tip-off on game nights:

```bash
npm run morning-slate   # assignments + odds + alerts.json
# or full historical refresh:
npm run build-ref-data
```

### Morning cron (9:05 AM ET)

```cron
5 9 * * * cd /path/to/ref-watch-nba && npm run morning-slate >> /var/log/ref-watch.log 2>&1
```

Set `ODDS_API_KEY` for sportsbook total comparison ([The Odds API](https://the-odds-api.com/)). Without it, pace alerts compare crew history to a **225-point proxy**.

Regenerate comprehensive seed data (75 refs, 3 seasons, all teams):

```bash
npm run generate-ref-seed
```

Seed team splits for all 30 teams from existing TOR/LAL templates:

```bash
npx tsx scripts/expand-team-splits.ts
```

## Pages

- `/` — Tonight's slate with **whistle premium alerts**, grudge-match flags, home bias
- `/teams` — All 30 NBA teams with links to crew history
- `/teams/[abbr]` — Team crew splits (e.g. `/teams/TOR`, `/teams/BOS`)
- `/raptors` → redirects to `/teams/TOR` (backwards compat)
- `/lakers` → redirects to `/teams/LAL` (backwards compat)
- `/refs` — All referees in the dataset
- `/refs/[slug]` — Ref betting profile: ATS, O/U buckets, spread splits, plus team links

## Methodology (MVP)

- **Ref betting profile** — home ATS, O/U by line bucket, spread by fav/dog (closing lines; synthetic in seed)
- **Whistle premium** — crew scoring delta vs league avg; alerts when premium and gap vs line exceed thresholds (sample-gated)
- **Home bias** — home vs away win rate under crew
- **Grudge match** — automated ref–team storylines on tonight's card
- **Games over 225 pts** — legacy fixed-baseline proxy on list views
- **Fouls per game** — combined personal fouls from both teams
- **Foul edge** — avg fouls on team vs opponent per game

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

## Limitations

- **Assignments** are live from official.nba.com when the page lists NBA games (empty during offseason).
- **Ref stats** may be **seeded** if `stats.nba.com` blocks your network (common on some cloud/VPN IPs). Re-run `build-ref-data` from a residential network for live backfill.
- **Seeded ATS/O/U** use synthetic closing lines; import `data/game-lines.json` or use live API backfill for real lines
- **No live in-play gauge** — requires play-by-play (planned)
- **No player props** — requires player × ref pipeline (planned)
- Not affiliated with the NBA. For entertainment/information only — see footer disclaimer.

## Stack

Next.js 15 · TypeScript · Tailwind CSS · App Router · JSON file cache (no database)
