import type { LeagueId } from "@/lib/leagues";

/** Minimum |ΔPTS| to surface any scoring highlight badge. */
export const HIGHLIGHT_SCORING_DELTA_MIN = 0.5;

/** Minimum |ΔPTS| for the primary "Biggest scoring …" superlative. */
export const HIGHLIGHT_SCORING_DELTA_TOP_TIER = 1.0;

/** Minimum |over rate − 50%| to surface an O/U highlight (5.0 percentage points). */
export const HIGHLIGHT_OVER_RATE_DEVIATION_MIN = 0.05;

/** Minimum |over rate − 50%| for primary "Highest/Lowest historical over-rate" labels. */
export const HIGHLIGHT_OVER_RATE_DEVIATION_TOP_TIER = 0.08;

/** Minimum |Δ fouls/flags| for whistle highlights (NBA/NFL). */
export const HIGHLIGHT_WHISTLE_DELTA_MIN = 1.5;

/** Minimum |Δ fouls/flags| for primary "Heaviest/Lightest …" whistle labels (NBA/NFL). */
export const HIGHLIGHT_WHISTLE_DELTA_TOP_TIER = 2.5;

/** NHL minors use a lower absolute scale than NBA fouls. */
export const HIGHLIGHT_NHL_MINORS_DELTA_MIN = 0.8;

/** Minimum |Δ NHL minors| for primary whistle labels. */
export const HIGHLIGHT_NHL_MINORS_DELTA_TOP_TIER = 1.2;

/** Minimum ref×team win-rate delta (percentage points) for matrix standout highlights. */
export const HIGHLIGHT_MATRIX_WIN_RATE_DELTA_MIN = 12;

export type HighlightSuperlativeKind =
  | "scoring-bump"
  | "scoring-dip"
  | "over-rate-high"
  | "over-rate-low"
  | "whistle-heavy"
  | "whistle-light"
  | "ats-strong"
  | "ou-high";

export type HighlightBadgeTier = "primary" | "secondary";

export type HighlightBadge = {
  label: string;
  tier: HighlightBadgeTier;
  superlativeKind: HighlightSuperlativeKind;
};

export function meetsScoringHighlightThreshold(delta: number): boolean {
  return Math.abs(delta) >= HIGHLIGHT_SCORING_DELTA_MIN;
}

export function meetsScoringTopTierThreshold(delta: number): boolean {
  return Math.abs(delta) >= HIGHLIGHT_SCORING_DELTA_TOP_TIER;
}

export function meetsOverRateHighlightThreshold(overRate: number): boolean {
  return Math.abs(overRate - 0.5) >= HIGHLIGHT_OVER_RATE_DEVIATION_MIN;
}

export function meetsOverRateTopTierThreshold(overRate: number): boolean {
  return Math.abs(overRate - 0.5) >= HIGHLIGHT_OVER_RATE_DEVIATION_TOP_TIER;
}

export function whistleHighlightMinDelta(leagueId: LeagueId): number {
  return leagueId === "nhl"
    ? HIGHLIGHT_NHL_MINORS_DELTA_MIN
    : HIGHLIGHT_WHISTLE_DELTA_MIN;
}

export function whistleHighlightTopTierMinDelta(leagueId: LeagueId): number {
  return leagueId === "nhl"
    ? HIGHLIGHT_NHL_MINORS_DELTA_TOP_TIER
    : HIGHLIGHT_WHISTLE_DELTA_TOP_TIER;
}

export function meetsWhistleHighlightThreshold(
  delta: number,
  leagueId: LeagueId,
): boolean {
  return Math.abs(delta) >= whistleHighlightMinDelta(leagueId);
}

export function meetsWhistleTopTierThreshold(
  delta: number,
  leagueId: LeagueId,
): boolean {
  return Math.abs(delta) >= whistleHighlightTopTierMinDelta(leagueId);
}

export function meetsMatrixWinRateExtremeThreshold(deltaPts: number): boolean {
  return Math.abs(deltaPts) >= HIGHLIGHT_MATRIX_WIN_RATE_DELTA_MIN;
}

export type HighlightBadgeRegistry = {
  scoringBadge: (delta: number) => HighlightBadge | null;
  overRateBadge: (overRate: number) => HighlightBadge | null;
  whistleBadge: (
    delta: number,
    whistleShort: string,
    leagueId: LeagueId,
  ) => HighlightBadge | null;
  atsBadge: () => HighlightBadge;
  ouBettingBadge: () => HighlightBadge;
};

/** Assign tiered, deduplicated superlative labels across one highlight grid. */
export function createHighlightBadgeRegistry(): HighlightBadgeRegistry {
  const primaryUsed = new Set<HighlightSuperlativeKind>();
  const secondaryRank = new Map<HighlightSuperlativeKind, number>();

  function claimBadge(
    kind: HighlightSuperlativeKind,
    primaryLabel: string,
    secondaryLabelForRank: (rank: number) => string,
    qualifiesForPrimary: boolean,
  ): HighlightBadge {
    if (qualifiesForPrimary && !primaryUsed.has(kind)) {
      primaryUsed.add(kind);
      return { label: primaryLabel, tier: "primary", superlativeKind: kind };
    }
    const rank = (secondaryRank.get(kind) ?? 0) + 1;
    secondaryRank.set(kind, rank);
    return {
      label: secondaryLabelForRank(rank),
      tier: "secondary",
      superlativeKind: kind,
    };
  }

  return {
    scoringBadge(delta: number): HighlightBadge | null {
      if (!meetsScoringHighlightThreshold(delta)) return null;
      const kind: HighlightSuperlativeKind =
        delta >= 0 ? "scoring-bump" : "scoring-dip";
      const direction = delta >= 0 ? "bump" : "dip";
      return claimBadge(
        kind,
        `Biggest scoring ${direction}`,
        (rank) =>
          rank === 1
            ? `Notable scoring ${direction}`
            : `Elevated scoring ${direction}`,
        meetsScoringTopTierThreshold(delta),
      );
    },

    overRateBadge(overRate: number): HighlightBadge | null {
      if (!meetsOverRateHighlightThreshold(overRate)) return null;
      const high = overRate >= 0.5;
      const kind: HighlightSuperlativeKind = high ? "over-rate-high" : "over-rate-low";
      return claimBadge(
        kind,
        high
          ? "Highest historical over-rate vs baseline"
          : "Lowest historical over-rate vs baseline",
        (rank) => {
          if (high) {
            return rank === 1
              ? "Notable over-rate vs baseline"
              : "Elevated over-rate vs baseline";
          }
          return rank === 1
            ? "Notable under-rate vs baseline"
            : "Elevated under-rate vs baseline";
        },
        meetsOverRateTopTierThreshold(overRate),
      );
    },

    whistleBadge(
      delta: number,
      whistleShort: string,
      leagueId: LeagueId,
    ): HighlightBadge | null {
      if (!meetsWhistleHighlightThreshold(delta, leagueId)) return null;
      const kind: HighlightSuperlativeKind =
        delta >= 0 ? "whistle-heavy" : "whistle-light";
      const unit = whistleShort.toLowerCase();
      return claimBadge(
        kind,
        delta >= 0 ? `Heaviest ${unit} ref` : `Lightest ${unit} ref`,
        (rank) => {
          if (delta >= 0) {
            return rank === 1
              ? `Notable heavy ${unit} pace`
              : `Elevated heavy ${unit} pace`;
          }
          return rank === 1
            ? `Notable light ${unit} pace`
            : `Elevated light ${unit} pace`;
        },
        meetsWhistleTopTierThreshold(delta, leagueId),
      );
    },

    atsBadge(): HighlightBadge {
      return claimBadge(
        "ats-strong",
        "Strongest home ATS track record",
        (rank) =>
          rank === 1
            ? "Notable home ATS track record"
            : "Elevated home ATS track record",
        true,
      );
    },

    ouBettingBadge(): HighlightBadge {
      return claimBadge(
        "ou-high",
        "Highest O/U hit rate vs closing total",
        (rank) =>
          rank === 1
            ? "Notable O/U hit rate vs closing total"
            : "Elevated O/U hit rate vs closing total",
        true,
      );
    },
  };
}
