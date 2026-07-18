# Market Efficiency Audit

Generated: 2026-07-18T23:51:07.655Z

Market total delta = actual combined score minus closing total. Efficient market (Yes) means the ref signal does not significantly predict that delta at p < 0.05. Inefficient (No) suggests possible unpriced alpha.

## Corpus coverage

| League | Total games | External lines | Joined audit games | Line source |
| --- | ---: | ---: | ---: | --- |
| NBA | 12,301 | 0 | 0 | The Odds API historical (data/game-lines.json) or merge-market-lines |
| NFL | 6,825 | 6,822 | 4,725 | nflverse closing lines (data/nfl/game-lines.json) |
| NHL | 12,282 | 0 | 0 | The Odds API / sportsbook shards via merge-market-lines |
| EPL | 3,800 | 3,800 | 3,800 | football-data ingest closing totals |
| LALIGA | 1,546 | 183 | 183 | ESPN pickcenter at ingest |
| CBB | 9,688 | 5,917 | 5,917 | ESPN pickcenter at ingest (data/cbb/game-logs.json) |

## Predictive power summary

Market efficient = **Yes** when the ref signal does not significantly predict total delta (p >= 0.05).

| Signal | League | n | Correlation | p-value | Market efficient? |
| --- | --- | ---: | ---: | ---: | --- |
| Crew whistle delta | NBA | 0 | - | - | Yes |
| Crew scoring delta | NBA | 0 | - | - | Yes |
| Crew over lean | NBA | 0 | - | - | Yes |
| Crew whistle delta | NFL | 4630 | -0.011 | 0.4741 | Yes |
| Crew scoring delta | NFL | 4630 | 0.133 | 0.0000 | **No** |
| Crew over lean | NFL | 4630 | 0.041 | 0.0052 | **No** |
| Crew GSNI (shrunk) | NFL | 2172 | 0.046 | 0.0308 | **No** |
| Crew whistle delta | NHL | 0 | - | - | Yes |
| Crew scoring delta | NHL | 0 | - | - | Yes |
| Crew over lean | NHL | 0 | - | - | Yes |
| Crew whistle delta | EPL | 3770 | -0.012 | 0.4723 | Yes |
| Crew scoring delta | EPL | 3770 | 0.120 | 0.0000 | **No** |
| Crew over lean | EPL | 3770 | 0.101 | 0.0000 | **No** |
| Crew whistle delta | LALIGA | 183 | 0.069 | 0.3505 | Yes |
| Crew scoring delta | LALIGA | 183 | -0.002 | 0.4323 | Yes |
| Crew over lean | LALIGA | 183 | 0.048 | 0.5187 | Yes |
| Crew whistle delta | CBB | 5917 | 0.056 | 0.0000 | **No** |
| Crew scoring delta | CBB | 5917 | 0.145 | 0.0000 | **No** |
| Crew over lean | CBB | 5917 | 0.176 | 0.0000 | **No** |

## Signal strength buckets (market total delta by tertile)

### NFL - Crew whistle delta

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 1543 | -0.62 | 0.27 | 47.6% |
| Mid signal | 1543 | 0.06 | 0.25 | 47.8% |
| High signal | 1544 | 0.81 | -1.10 | 45.9% |

### NFL - Crew scoring delta

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 1543 | -2.38 | -1.93 | 42.5% |
| Mid signal | 1543 | -0.39 | -0.62 | 46.2% |
| High signal | 1544 | 0.88 | 1.97 | 52.6% |

### NFL - Crew over lean

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 1543 | 0.06 | -0.14 | 45.2% |
| Mid signal | 1543 | 0.12 | -0.14 | 47.4% |
| High signal | 1544 | 0.18 | -0.29 | 48.8% |

### NFL - Crew GSNI (shrunk)

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 724 | -21.16 | -1.62 | 44.9% |
| Mid signal | 724 | -11.94 | -0.96 | 44.8% |
| High signal | 724 | 18.44 | 0.34 | 49.2% |

### EPL - Crew whistle delta

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 1256 | -1.27 | 0.31 | 55.1% |
| Mid signal | 1256 | -0.02 | 0.39 | 54.2% |
| High signal | 1258 | 1.14 | 0.31 | 53.8% |

### EPL - Crew scoring delta

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 1256 | -0.18 | 0.12 | 49.4% |
| Mid signal | 1256 | 0.06 | 0.37 | 55.7% |
| High signal | 1258 | 0.24 | 0.52 | 58.0% |

### EPL - Crew over lean

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 1256 | -0.01 | 0.14 | 48.4% |
| Mid signal | 1256 | 0.05 | 0.35 | 55.6% |
| High signal | 1258 | 0.10 | 0.51 | 59.1% |

### LALIGA - Crew whistle delta

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 61 | -1.50 | 0.25 | 55.7% |
| Mid signal | 61 | 0.35 | -0.04 | 44.3% |
| High signal | 61 | 1.93 | 0.35 | 49.2% |

### LALIGA - Crew scoring delta

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 61 | -0.30 | 0.16 | 50.8% |
| Mid signal | 61 | 0.06 | 0.40 | 52.5% |
| High signal | 61 | 0.21 | 0.01 | 45.9% |

### LALIGA - Crew over lean

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 61 | -0.13 | 0.16 | 47.5% |
| Mid signal | 61 | -0.01 | 0.09 | 47.5% |
| High signal | 61 | 0.07 | 0.32 | 54.1% |

### CBB - Crew whistle delta

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 1972 | -1.11 | 0.01 | 48.2% |
| Mid signal | 1972 | 0.12 | 0.28 | 49.6% |
| High signal | 1973 | 1.21 | 1.71 | 52.6% |

### CBB - Crew scoring delta

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 1972 | -2.52 | -1.65 | 44.6% |
| Mid signal | 1972 | -0.16 | 1.27 | 51.6% |
| High signal | 1973 | 1.85 | 2.38 | 54.2% |

### CBB - Crew over lean

| Bucket | Games | Avg signal | Avg market delta | Over closing rate |
| --- | ---: | ---: | ---: | ---: |
| Low signal | 1972 | -0.03 | -2.33 | 39.6% |
| Mid signal | 1972 | 0.02 | 0.96 | 50.7% |
| High signal | 1973 | 0.05 | 3.37 | 60.2% |

## Data pipeline

1. Game logs with officiating crews and play-level whistle context
2. Closing totals joined from The Odds API (NBA/NHL), nflverse (NFL), or ESPN pickcenter (CBB/soccer)
3. Crew signals from ref-stats profiles (whistle delta, scoring delta, over lean, GSNI for NFL)
4. OLS regression: market total delta ~ ref signal

Run `npm run fetch-nba-historical-lines` (paid Odds API) and `npm run merge-market-lines` to expand NBA/NHL external-line coverage.

