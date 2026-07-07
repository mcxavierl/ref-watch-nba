# Honesty audit

Generated: 2026-07-07T18:45:12.169Z

Counts reflect provenance tags that would be shown in the UI (ref profiles, betting splits, slate crew metrics).

## NBA

- Data source: **seeded**
- Ref profiles: **53**
- League baseline fallback: **no**
- Displayed metrics: **53** real · **424** partial · **0** estimated (477 total)
- Refs below sample gate: **0**
- Over-rate metrics marked estimated/partial: **53** / 53

### Violations (34)

- **ref:jacyn-goble-68** · ou-bucket:230+: O/U bucket 31/36 games — below gate (tag: `computed-with-partial-data`)
- **ref:eric-dalen-37** · ou-bucket:230+: O/U bucket 19/30 games — below gate (tag: `computed-with-partial-data`)
- **ref:jenna-schroeder-20** · ou-bucket:230+: O/U bucket 20/29 games — below gate (tag: `computed-with-partial-data`)
- **ref:jenna-reneau-93** · ou-bucket:230+: O/U bucket 24/29 games — below gate (tag: `computed-with-partial-data`)
- **ref:james-williams-60** · ou-bucket:230+: O/U bucket 22/28 games — below gate (tag: `computed-with-partial-data`)
- **ref:brian-forte-45** · ou-bucket:230+: O/U bucket 16/28 games — below gate (tag: `computed-with-partial-data`)
- **ref:pat-fraher-26** · ou-bucket:230+: O/U bucket 19/28 games — below gate (tag: `computed-with-partial-data`)
- **ref:matt-myers-43** · ou-bucket:230+: O/U bucket 22/27 games — below gate (tag: `computed-with-partial-data`)
- **ref:ben-taylor-46** · ou-bucket:230+: O/U bucket 24/27 games — below gate (tag: `computed-with-partial-data`)
- **ref:andy-nagy-83** · ou-bucket:230+: O/U bucket 13/21 games — below gate (tag: `computed-with-partial-data`)
- **ref:phenizee-ransom-70** · ou-bucket:230+: O/U bucket 18/21 games — below gate (tag: `computed-with-partial-data`)
- **ref:curtis-blair-74** · ou-bucket:230+: O/U bucket 15/20 games — below gate (tag: `computed-with-partial-data`)
- **ref:eric-lewis-84** · ou-bucket:230+: O/U bucket 17/20 games — below gate (tag: `computed-with-partial-data`)
- **ref:dedric-taylor-21** · ou-bucket:230+: O/U bucket 11/20 games — below gate (tag: `computed-with-partial-data`)
- **ref:gediminas-petraitis-50** · ou-bucket:230+: O/U bucket 11/19 games — below gate (tag: `computed-with-partial-data`)
- **ref:josh-tiven-58** · ou-bucket:230+: O/U bucket 15/19 games — below gate (tag: `computed-with-partial-data`)
- **ref:courtney-kirkland-61** · ou-bucket:230+: O/U bucket 9/19 games — below gate (tag: `computed-with-partial-data`)
- **ref:che-flores-91** · ou-bucket:230+: O/U bucket 6/19 games — below gate (tag: `computed-with-partial-data`)
- **ref:brandon-adair-67** · ou-bucket:230+: O/U bucket 13/19 games — below gate (tag: `computed-with-partial-data`)
- **ref:tony-brothers-25** · ou-bucket:230+: O/U bucket 10/18 games — below gate (tag: `computed-with-partial-data`)
- **ref:karl-lane-77** · ou-bucket:230+: O/U bucket 3/18 games — below gate (tag: `computed-with-partial-data`)
- **ref:scott-foster-48** · ou-bucket:230+: O/U bucket 14/18 games — below gate (tag: `computed-with-partial-data`)
- **ref:james-capers-19** · ou-bucket:230+: O/U bucket 15/18 games — below gate (tag: `computed-with-partial-data`)
- **ref:marc-davis-8** · ou-bucket:230+: O/U bucket 7/9 games — below gate (tag: `computed-with-partial-data`)
- **ref:natalie-sago-9** · ou-bucket:230+: O/U bucket 6/9 games — below gate (tag: `computed-with-partial-data`)
- **ref:scott-twardoski-52** · ou-bucket:230+: O/U bucket 2/9 games — below gate (tag: `computed-with-partial-data`)
- **ref:ray-acosta-54** · ou-bucket:230+: O/U bucket 1/9 games — below gate (tag: `computed-with-partial-data`)
- **ref:robert-hussey-85** · ou-bucket:230+: O/U bucket 4/9 games — below gate (tag: `computed-with-partial-data`)
- **ref:pat-o-connell-90** · ou-bucket:230+: O/U bucket 7/9 games — below gate (tag: `computed-with-partial-data`)
- **ref:cj-washington-12** · ou-bucket:230+: O/U bucket 2/9 games — below gate (tag: `computed-with-partial-data`)
- …and 4 more

## NHL

- Data source: **seeded**
- Ref profiles: **41**
- League baseline fallback: **no**
- Displayed metrics: **64** real · **397** partial · **0** estimated (461 total)
- Refs below sample gate: **0**
- Over-rate metrics marked estimated/partial: **41** / 41

No honesty violations flagged.

## Summary

| League | Real | Partial | Estimated | Total | Issues |
| --- | ---: | ---: | ---: | ---: | ---: |
| NBA | 53 | 424 | 0 | 477 | 34 |
| NHL | 64 | 397 | 0 | 461 | 0 |

Re-run after data rebuilds: `npm run honesty-audit`
