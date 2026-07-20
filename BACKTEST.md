# Ref Watch backtest results

Generated: 2026-07-18T02:06:15.162Z

Only games with lineSource=external are scored. Synthetic or missing lines are excluded, not fabricated.

## NBA Whistle Premium (pace alert)

Walk-forward: ref crew averages exclude target game and later games. High pace: scoring premium ≥ +4 and gap vs closing total ≥ +3. Low pace: scoring premium ≤ −4 and gap ≤ −3. Sample gate: ≥2 qualified refs (30+ games) and non-weak sample.

**Summary:** No external-line NBA games in game logs. Backtest not scored.

| Exclusion | Count |
|-----------|------:|
| Synthetic / non-external lines | 12301 |
| Missing officials | 0 |
| Insufficient prior history | 0 |

**Real-line games scored:** 0

| Bucket | n | O/U hit rate | ATS hit rate | ROI (-110) |
|--------|--:|-------------:|-------------:|-----------:|
| Signal cleared: high pace (bet Over) | 0 | - | - | - |
| Signal cleared: low pace (bet Under) | 0 | - | - | - |
| Threshold met, sample gate not cleared | 0 | - | - | - |
| No signal (control) | 0 | - | - | - |
| All real-line games (coin-flip control) | 0 | - | - | - |

Break-even O/U rate at -110 vig: **52.38%**


## NHL PP Premium

Walk-forward: ref minor averages exclude target game and later games. Signal when index = (refMinorRate − leagueAvgMinors) × specialTeamsEdge × 8 ≥ 0.35. Referees only (25+ prior games). Direction: Over closing total.

**Summary:** No external-line NHL games in game logs. Backtest not scored.

| Exclusion | Count |
|-----------|------:|
| Synthetic / non-external lines | 12282 |
| Missing officials | 0 |
| Insufficient prior history | 0 |

**Real-line games scored:** 0

| Bucket | n | O/U hit rate | ATS hit rate | ROI (-110) |
|--------|--:|-------------:|-------------:|-----------:|
| PP Premium cleared (bet Over) | 0 | - | - | - |
| Below threshold (control) | 0 | - | - | - |
| No qualifying refs (control) | 0 | - | - | - |
| All real-line games (coin-flip control) | 0 | - | - | - |

Break-even O/U rate at -110 vig: **52.38%**


## Caveats

- Signals are historical associations, not live recommendations.
- Walk-forward design prevents lookahead within ref histories; it does not account for roster, rule, or scheduling changes.
- ATS is reported where spread data exists on external-line games (NBA).
- NHL PP Premium uses season-level special-teams rates from `team-special-teams.json`, not walk-forward team form.
- With empty `game-lines.json` / NHL odds, most builds produce zero external-line games — results reflect data availability honestly.
