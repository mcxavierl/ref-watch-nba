# Honesty audit

Generated: 2026-07-11T20:01:13.338Z

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
- Ref profiles: **123**
- League baseline fallback: **no**
- Displayed metrics: **711** real · **21** partial · **0** estimated (732 total)
- Refs below sample gate: **7**
- Over-rate metrics marked estimated/partial: **7** / 123

No honesty violations flagged.
## NFL

- Data source: **espn**
- Ref profiles: **211**
- League baseline fallback: **no**
- Displayed metrics: **211** real · **0** partial · **0** estimated (211 total)

No honesty violations flagged.

## CBB

- Data source: **espn**
- Ref profiles: **386**
- League baseline fallback: **yes**
- Displayed metrics: **386** real · **0** partial · **0** estimated (386 total)

No honesty violations flagged.

## CFB

- Data source: **seeded**
- Ref profiles: **0**
- League baseline fallback: **yes**
- Displayed metrics: **0** real · **0** partial · **0** estimated (0 total)

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
| NBA | 109 | 0 | 327 | 436 | 0 |
| NHL | 711 | 21 | 0 | 732 | 0 |
| NFL | 211 | 0 | 0 | 211 | 0 |
| CBB | 386 | 0 | 0 | 386 | 0 |
| CFB | 0 | 0 | 0 | 0 | 0 |
| EPL | 0 | 0 | 0 | 48 | 0 |

Re-run after data rebuilds: `npm run honesty-audit`
NFL ESPN cross-check: `node scripts/validate-nfl-accuracy.js`
