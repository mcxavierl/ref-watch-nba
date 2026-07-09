# Honesty audit

Generated: 2026-07-09T01:15:25.600Z

Counts reflect provenance tags that would be shown in the UI (ref profiles, betting splits, slate crew metrics).

## NBA

- Data source: **seeded**
- Ref profiles: **53**
- League baseline fallback: **no**
- Displayed metrics: **397** real · **80** partial · **0** estimated (477 total)
- Refs below sample gate: **0**
- Over-rate metrics marked estimated/partial: **0** / 53

No honesty violations flagged.

## NHL

- Data source: **nhl-api**
- Ref profiles: **77**
- League baseline fallback: **no**
- Displayed metrics: **440** real · **0** partial · **0** estimated (440 total)
- Refs below sample gate: **77**
- Over-rate metrics marked estimated/partial: **0** / 77

### Violations (231)

- **ref:ryan-gibbons-58** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:ryan-gibbons-58** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:ryan-gibbons-58** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:kyle-flemington-55** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:kyle-flemington-55** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:kyle-flemington-55** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:david-brisebois-96** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:david-brisebois-96** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:david-brisebois-96** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:caleb-apperson-77** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:caleb-apperson-77** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:caleb-apperson-77** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:trent-knorr-74** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:trent-knorr-74** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:trent-knorr-74** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:dan-kelly-98** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:dan-kelly-98** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:dan-kelly-98** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:carter-sandlak-29** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:carter-sandlak-29** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:carter-sandlak-29** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:brian-pochmara-16** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:brian-pochmara-16** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:brian-pochmara-16** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:pierre-lambert-25** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:pierre-lambert-25** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:pierre-lambert-25** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:cody-beach-12** · avgTotalPoints: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:cody-beach-12** · avgFouls: Below sample gate but tagged as real (tag: `computed-from-real`)
- **ref:cody-beach-12** · overRate: Below sample gate but tagged as real (tag: `computed-from-real`)
- …and 201 more
## NFL

- Data source: **hybrid**
- Ref profiles: **175**
- League baseline fallback: **yes**
- Displayed metrics: **175** real · **0** partial · **0** estimated (175 total)

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
- Ref profiles: **32**
- League baseline fallback: **yes**
- Displayed metrics: **32** real · **0** partial · **0** estimated (32 total)

No honesty violations flagged.


## Summary

| League | Real | Partial | Estimated | Total | Issues |
| --- | ---: | ---: | ---: | ---: | ---: |
| NBA | 397 | 80 | 0 | 477 | 0 |
| NHL | 440 | 0 | 0 | 440 | 231 |
| NFL | 175 | 0 | 0 | 175 | 0 |
| CBB | 0 | 0 | 0 | 0 | 0 |
| CFB | 0 | 0 | 0 | 0 | 0 |
| EPL | 32 | 0 | 0 | 32 | 0 |

Re-run after data rebuilds: `npm run honesty-audit`
NFL ESPN cross-check: `node scripts/validate-nfl-accuracy.js`
