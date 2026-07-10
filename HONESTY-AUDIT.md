# Honesty audit

Generated: 2026-07-10T16:38:13.864Z

Counts reflect provenance tags that would be shown in the UI (ref profiles, betting splits, slate crew metrics).

## NBA

- Data source: **hybrid**
- Ref profiles: **109**
- League baseline fallback: **no**
- Displayed metrics: **109** real · **0** partial · **327** estimated (436 total)
- Refs below sample gate: **12**
- Over-rate metrics marked estimated/partial: **109** / 109

No honesty violations flagged.

## NHL

- Data source: **nhl-api**
- Ref profiles: **120**
- League baseline fallback: **no**
- Displayed metrics: **558** real · **126** partial · **0** estimated (684 total)
- Refs below sample gate: **42**
- Over-rate metrics marked estimated/partial: **42** / 120

No honesty violations flagged.
## NFL

- Data source: **espn**
- Ref profiles: **208**
- League baseline fallback: **yes**
- Displayed metrics: **208** real · **0** partial · **0** estimated (208 total)

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

- Data source: **espn**
- Ref profiles: **47**
- League baseline fallback: **yes**
- Displayed metrics: **47** real · **0** partial · **0** estimated (47 total)

No honesty violations flagged.


## Summary

| League | Real | Partial | Estimated | Total | Issues |
| --- | ---: | ---: | ---: | ---: | ---: |
| NBA | 109 | 0 | 327 | 436 | 0 |
| NHL | 558 | 126 | 0 | 684 | 0 |
| NFL | 208 | 0 | 0 | 208 | 0 |
| CBB | 0 | 0 | 0 | 0 | 0 |
| CFB | 0 | 0 | 0 | 0 | 0 |
| EPL | 47 | 0 | 0 | 47 | 0 |

Re-run after data rebuilds: `npm run honesty-audit`
NFL ESPN cross-check: `node scripts/validate-nfl-accuracy.js`
