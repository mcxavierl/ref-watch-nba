# Honesty audit

Generated: 2026-07-08T16:52:25.595Z

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

- Data source: **hybrid**
- Ref profiles: **175**
- League baseline fallback: **no**
- Displayed metrics: **0** real · **0** partial · **0** estimated (175 total)

### Violations (168)

- **meta** · source: Expected espn source, got hybrid (tag: `fallback-constant`)
- **meta** · atsAvailable: NFL ATS flagged available but no verified closing lines (tag: `computed-from-real`)
- **ref:land-clark-130** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:adrian-hill-29** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:tra-blake-3** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:barry-anderson-20** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:shawn-smith-14** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:alan-eck-76** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:clete-blakeman-34** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:brad-rogers-126** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:scott-novak-1** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:carl-cheffers-51** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:jerome-boger-23** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:carl-johnson-101** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:clay-martin-19** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:brad-allen-122** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:bryan-neale-92** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:mark-hittner-28** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:bill-vinovich-52** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- **ref:shawn-hochuli-83** · bettingStats.linesAvailable: NFL ref shows betting lines but league has no closing lines (tag: `computed-from-real`)
- …and 148 more

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
- League baseline fallback: **no**
- Displayed metrics: **32** real · **0** partial · **0** estimated (32 total)

No honesty violations flagged.


## Summary

| League | Real | Partial | Estimated | Total | Issues |
| --- | ---: | ---: | ---: | ---: | ---: |
| NBA | 411 | 66 | 0 | 477 | 0 |
| NHL | 461 | 0 | 0 | 461 | 0 |
| NFL | 0 | 0 | 0 | 175 | 168 |
| CBB | 0 | 0 | 0 | 0 | 0 |
| CFB | 0 | 0 | 0 | 0 | 0 |
| EPL | 32 | 0 | 0 | 32 | 0 |

Re-run after data rebuilds: `npm run honesty-audit`
NFL ESPN cross-check: `node scripts/validate-nfl-accuracy.js`
