# Honesty audit

Generated: 2026-07-07T04:15:42.510Z

Counts reflect provenance tags that would be shown in the UI (ref profiles, betting splits, slate crew metrics).

## NBA

- Data source: **seeded**
- Ref profiles: **75**
- League baseline fallback: **no**
- Displayed metrics: **75** real · **600** partial · **0** estimated (675 total)
- Refs below sample gate: **0**
- Over-rate metrics marked estimated/partial: **75** / 75

### Violations (50)

- **ref:phenizee-ransom-70** · ou-bucket:230+: O/U bucket 4/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:james-williams-60** · ou-bucket:230+: O/U bucket 6/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:nate-green-41** · ou-bucket:230+: O/U bucket 7/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:ben-taylor-46** · ou-bucket:230+: O/U bucket 6/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:zach-zarba-15** · ou-bucket:230+: O/U bucket 5/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:jonathan-sterling-17** · ou-bucket:230+: O/U bucket 2/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:brent-barnaky-36** · ou-bucket:230+: O/U bucket 3/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:derrick-collins-11** · ou-bucket:230+: O/U bucket 6/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:josh-tiven-58** · ou-bucket:230+: O/U bucket 6/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:evan-scott-78** · ou-bucket:230+: O/U bucket 4/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:tre-maddox-23** · ou-bucket:230+: O/U bucket 6/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:ray-acosta-54** · ou-bucket:230+: O/U bucket 7/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:tyler-ford-39** · ou-bucket:230+: O/U bucket 7/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:intae-hwang-73** · ou-bucket:230+: O/U bucket 6/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:mark-lindsay-29** · ou-bucket:230+: O/U bucket 6/8 games — below gate (tag: `computed-with-partial-data`)
- **ref:dedric-taylor-21** · ou-bucket:230+: O/U bucket 4/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:andy-nagy-83** · ou-bucket:230+: O/U bucket 5/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:jacyn-goble-68** · ou-bucket:230+: O/U bucket 3/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:matt-myers-43** · ou-bucket:230+: O/U bucket 4/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:sean-corbin-33** · ou-bucket:230+: O/U bucket 6/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:simone-jelks-81** · ou-bucket:230+: O/U bucket 4/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:dannica-baroody-89** · ou-bucket:230+: O/U bucket 6/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:john-goble-10** · ou-bucket:230+: O/U bucket 4/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:curtis-blair-74** · ou-bucket:230+: O/U bucket 4/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:kevin-cutler-34** · ou-bucket:230+: O/U bucket 3/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:sean-wright-4** · ou-bucket:230+: O/U bucket 5/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:john-conley-56** · ou-bucket:230+: O/U bucket 3/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:danielle-scott-87** · ou-bucket:230+: O/U bucket 4/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:brian-forte-45** · ou-bucket:230+: O/U bucket 2/7 games — below gate (tag: `computed-with-partial-data`)
- **ref:jenna-reneau-93** · ou-bucket:230+: O/U bucket 4/7 games — below gate (tag: `computed-with-partial-data`)
- …and 20 more

## NHL

- Data source: **seeded**
- Ref profiles: **45**
- League baseline fallback: **no**
- Displayed metrics: **72** real · **441** partial · **0** estimated (513 total)
- Refs below sample gate: **0**
- Over-rate metrics marked estimated/partial: **45** / 45

### Violations (1)

- **meta** · dataset: Seeded dataset has 72 metrics tagged as real (tag: `computed-from-real`)

## Summary

| League | Real | Partial | Estimated | Total | Issues |
| --- | ---: | ---: | ---: | ---: | ---: |
| NBA | 75 | 600 | 0 | 675 | 50 |
| NHL | 72 | 441 | 0 | 513 | 1 |

Re-run after data rebuilds: `npm run honesty-audit`
