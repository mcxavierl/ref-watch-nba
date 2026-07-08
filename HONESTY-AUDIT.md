# Honesty audit

Generated: 2026-07-08T06:04:42.616Z

Counts reflect provenance tags that would be shown in the UI (ref profiles, betting splits, slate crew metrics).

## NBA

- Data source: **seeded**
- Ref profiles: **53**
- League baseline fallback: **no**
- Displayed metrics: **411** real · **66** partial · **0** estimated (477 total)
- Refs below sample gate: **0**
- Over-rate metrics marked estimated/partial: **0** / 53

No honesty violations flagged.

## NHL

- Data source: **seeded**
- Ref profiles: **41**
- League baseline fallback: **no**
- Displayed metrics: **461** real · **0** partial · **0** estimated (461 total)
- Refs below sample gate: **0**
- Over-rate metrics marked estimated/partial: **0** / 41

No honesty violations flagged.
## NFL

- Data source: **espn**
- Ref profiles: **127**
- League baseline fallback: **no**
- Displayed metrics: **127** real · **0** partial · **0** estimated (127 total)

No honesty violations flagged.

## CBB

- Data source: **seeded**
- Ref profiles: **0**
- League baseline fallback: **yes**
- Displayed metrics: **0** real · **0** partial · **0** estimated (0 total)

No honesty violations flagged.

## CFB

- Data source: **seeded**
- Ref profiles: **0**
- League baseline fallback: **yes**
- Displayed metrics: **0** real · **0** partial · **0** estimated (0 total)

No honesty violations flagged.

## EPL

- Data source: **seeded**
- Ref profiles: **20**
- League baseline fallback: **yes**
- Displayed metrics: **0** real · **20** partial · **0** estimated (20 total)

No honesty violations flagged.


## Summary

| League | Real | Partial | Estimated | Total | Issues |
| --- | ---: | ---: | ---: | ---: | ---: |
| NBA | 411 | 66 | 0 | 477 | 0 |
| NHL | 461 | 0 | 0 | 461 | 0 |
| NFL | 127 | 0 | 0 | 127 | 0 |
| CBB | 0 | 0 | 0 | 0 | 0 |
| CFB | 0 | 0 | 0 | 0 | 0 |
| EPL | 0 | 20 | 0 | 20 | 0 |

Re-run after data rebuilds: `npm run honesty-audit`
NFL ESPN cross-check: `node scripts/validate-nfl-accuracy.js`
