# Honesty audit

Generated: 2026-07-14T21:32:57.275Z

Counts reflect provenance tags that would be shown in the UI (ref profiles, betting splits, slate crew metrics).

## NBA

- Data source: **hybrid**
- Ref profiles: **109**
- League baseline fallback: **no**
- Displayed metrics: **400** real · **36** partial · **0** estimated (436 total)
- Refs below sample gate: **12**
- Over-rate metrics marked estimated/partial: **12** / 109

No honesty violations flagged.

## NHL

- Data source: **nhl-api**
- Ref profiles: **123**
- League baseline fallback: **no**
- Displayed metrics: **1306** real · **41** partial · **0** estimated (1347 total)
- Refs below sample gate: **7**
- Over-rate metrics marked estimated/partial: **7** / 123

No honesty violations flagged.
## NFL

- Data source: **espn**
- Ref profiles: **264**
- League baseline fallback: **no**
- Displayed metrics: **264** real · **0** partial · **0** estimated (264 total)

No honesty violations flagged.

## CBB

- Data source: **espn**
- Ref profiles: **386**
- League baseline fallback: **yes**
- Displayed metrics: **386** real · **0** partial · **0** estimated (386 total)

No honesty violations flagged.

## CFB

- Data source: **espn**
- Ref profiles: **4**
- League baseline fallback: **yes**
- Displayed metrics: **4** real · **0** partial · **0** estimated (4 total)

No honesty violations flagged.

## EPL

- Data source: **football-data**
- Ref profiles: **48**
- League baseline fallback: **no**
- Displayed metrics: **0** real · **0** partial · **0** estimated (48 total)

No honesty violations flagged.


## Summary

| League | Real | Partial | Estimated | Total | Issues |
| --- | ---: | ---: | ---: | ---: | ---: |
| NBA | 400 | 36 | 0 | 436 | 0 |
| NHL | 1306 | 41 | 0 | 1347 | 0 |
| NFL | 264 | 0 | 0 | 264 | 0 |
| CBB | 386 | 0 | 0 | 386 | 0 |
| CFB | 4 | 0 | 0 | 4 | 0 |
| EPL | 0 | 0 | 0 | 48 | 0 |

Re-run after data rebuilds: `npm run honesty-audit`
NFL ESPN cross-check: `node scripts/validate-nfl-accuracy.js`
