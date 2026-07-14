# NCAA Officials Roster — Reconstruction Audit

Reconstructed at: **2026-07-14T01:59:57.618Z**

## Canonical outputs

| File | Rows | Schema |
| --- | ---: | --- |
| `ncaa_cbb_officials_2024.csv` | 386 | `official_id,full_name,league_id,primary_conference,experience_years` |
| `ncaa_cfb_officials_2024.csv` | 264 | `official_id,full_name,league_id,primary_conference,experience_years` |

Ingest-compatible copies are mirrored under `raw/` for `npm run ingest-ncaa-officials`.

## CBB source integrity

| Layer | Source | Notes |
| --- | --- | --- |
| Primary roster | `data/cbb/ref-stats.json` | Forensic reconstruction from ESPN-verified game logs (full active pool) |
| NCAA validation | NCAA.com tournament assignments | Public press-release tables scraped for cross-check |

### NCAA.com scrape validation

- Scraped names: **42**
- Matched in reconstructed roster: **39**

| Article | URL | Names parsed |
| --- | --- | ---: |
| 2024 NCAA Men's Sweet 16 / Elite 8 officials | https://www.ncaa.com/news/basketball-men/article/2024-03-25/ncaa-di-mens-basketball-committee-announces-game-officials-2024-sweet-16-and | 40 |
| 2024 NCAA Men's Final Four officials | https://www.ncaa.com/news/basketball-men/article/2024-04-01/ncaa-division-i-mens-basketball-committee-names-game-officials-2024-mens-final | 11 |

> NCAA does not publish a single master Division I basketball officials directory.
> Tournament assignment tables are the largest public NCAA-published official lists.
> The full working roster is reconstructed from verified game-log officiating crews.

## CFB source integrity

| Layer | Source | Notes |
| --- | --- | --- |
| Primary roster | `data/cfb/ref-stats.json` | Cross-sport officiating pool mirrored from verified ESPN/NFL game logs (CFB game-log ingestion pending). |

> NCAA and College Football Officiating (CFO) do not publish a comprehensive public
> Division I on-field officials registry. Conference coordinators assign crews privately.
> This reconstruction uses the verified cross-sport officiating pool already present in
> RefWatch ref-stats until dedicated CFB game-log ingestion is available.

## Regeneration

```bash
npm run reconstruct-ncaa-rosters
npm run ingest-ncaa-officials
```
