# Leverage-Weighted Impact Score (LWIS)

## Purpose

LWIS measures **outcome-shaping officiating behavior**, not whistle volume. It separates:

| Track | Metric family | What it measures |
| --- | --- | --- |
| **Administrative / procedural** | Frequency-based | Objective, procedural whistles (false starts, delays, offside, shot-clock violations) |
| **Subjective / judgment** | Impact-based (LWIS) | Discretionary calls weighted by game leverage and win-probability movement |

High flag counts alone do not imply high impact. LWIS highlights officials whose **subjective** decisions move win probability in pivotal contexts.

## Aggregation formula

```
LWIS = Σ(|ΔWPA| × LeverageWeight)
```

Summation runs over **subjective** penalty events only. Administrative/procedural whistles are excluded from LWIS.

### LeverageWeight tiers

| Context | Multiplier |
| --- | ---: |
| Time remaining **< 120s** and score differential **< 8** | **2.0×** |
| **3rd or 4th down** | **1.5×** |
| All other situations | **1.0×** |

Crisis context (2.0×) takes precedence over pressure-down context (1.5×).

### |ΔWPA| sourcing

1. **Play-level data available:** use observed `|wpaDelta|` from the penalty event.
2. **No play-level WPA:** use `LWIS_DEFAULT_ABS_WPA_PROXY` (0.025) as the absolute WPA component before leverage weighting.

Implementation: `src/lib/whistle-disposition.ts` (`computeSubjectiveEventLwis`).

## Sample window

LWIS is computed on the official’s **trailing 100-game** crew sample within the active season scope.

## Surfacing gate

An official’s **Impact Score** is only surfaced in Research and profile UI when:

> The official has **at least 15 high-leverage subjective events** within the trailing 100-game sample.

A **high-leverage event** is a subjective whistle where `LeverageWeight > 1.0` (crisis or pressure-down tier).

Constants:

- `LWIS_TRAILING_GAME_WINDOW = 100`
- `LWIS_MIN_HIGH_LEVERAGE_EVENTS = 15`

Officials below the gate may still show administrative frequency metrics; LWIS impact score is withheld until the gate clears.

## Research ranking

`buildWhistleDispositionResearchCards` ranks officials by **LWIS divergence from league mean** (`lwisPerGame − peerMean`), not raw subjective flag volume.

Research cards present:

- **Administrative rate (freq)** — procedural whistle frequency vs league average
- **Impact score (leverage-weighted)** — LWIS per game vs league LWIS mean

## Outlier detection

Officials with LWIS per game **≥ 2 standard deviations** above the peer group (among gate-qualified officials) are tagged **High-Impact** outliers in friction-matrix and profile surfaces.

## Related modules

| Module | Role |
| --- | --- |
| `src/config/penalty-types.ts` | Subjective vs administrative taxonomy; contextual leverage multipliers |
| `src/lib/whistle-disposition.ts` | LWIS aggregation, gates, research cards |
| `src/lib/friction-matrix.ts` | High-impact official outlier export |
| `src/components/WhistleDispositionResearchSection.tsx` | Research dashboard UI |

## Interpretation notes

- LWIS is **descriptive**, not predictive. It quantifies how much subjective officiating coincided with win-probability movement in leveraged situations.
- Without play-level penalty codes, subjective splits and LWIS use taxonomy defaults; PBP-backed games are labeled in the UI.
- Conference-level means are planned; current peer baselines use league-scoped pools of gate-qualified officials.
