import {
  computeRefGeoCorrelations,
  type GeoCorrelationFinding,
} from "@/lib/geo-correlations";
import { computeRefMarqueePerformance, MARQUEE_CI_MIN_GAMES, passesMarqueeComparisonGate } from "@/lib/marquee-metrics";
import {
  computeRefWhistleFatigue,
  WHISTLE_DRIFT_EXTREME_PCT,
  WHISTLE_DRIFT_MIN_GAMES,
  type RefWhistleFatigueProfile,
} from "@/lib/whistle-fatigue";
import type { LeagueId } from "@/lib/leagues";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { RefMarqueePerformance } from "@/lib/marquee-metrics";
import type { RefProfile, RefStatsFile } from "@/lib/types";
import { LEAGUE_AVG_HIGH_LEVERAGE_IMPACT } from "@/lib/impact-calculator";

/** Serializable insight kinds — safe across Server → Client boundary. */
export type RefMasterInsightKind =
  | "hometown-alignment"
  | "overcompensation"
  | "marquee-efficiency"
  | "whistle-fatigue"
  | "high-leverage-penalty";

export type RefMasterInsightStat = {
  label: string;
  value: string;
  detail?: string;
};

/**
 * JSON-serializable insight payload for DynamicInsightPill.
 * `interactive` is false when this is the sole qualifying insight (static badge).
 */
export type RefMasterInsight = {
  id: string;
  kind: RefMasterInsightKind;
  pillLabel: string;
  shortLine: string;
  headline: string;
  summary: string;
  confidence: "high" | "moderate";
  interactive: boolean;
  stats: RefMasterInsightStat[];
  footnote?: string;
};

const MARQUEE_MIN_DELTA_PP = 6;
const HIGH_LEVERAGE_MIN_DELTA = 1.8;

const FOUL_LABELS: Partial<Record<LeagueId, string>> = {
  nfl: "Flags per game",
  nhl: "Minors per game",
  epl: "Cards per game",
  laliga: "Cards per game",
};

function geoKind(archetype: GeoCorrelationFinding["archetype"]): RefMasterInsightKind {
  return archetype === "hometown-alignment"
    ? "hometown-alignment"
    : "overcompensation";
}

function geoPillLabel(kind: RefMasterInsightKind): string {
  return kind === "hometown-alignment"
    ? "Hometown Alignment"
    : "Overcompensation";
}

function insightFromGeo(finding: GeoCorrelationFinding): RefMasterInsight {
  const kind = geoKind(finding.archetype);
  const signalLabel =
    finding.signal === "cover"
      ? "ATS cover"
      : finding.signal === "whistle"
        ? "Whistle volume"
        : "Win rate";

  return {
    id: `geo-${finding.id}`,
    kind,
    pillLabel: geoPillLabel(kind),
    shortLine: `${formatSigned(finding.deltaPp)} pts ${signalLabel} in ${finding.territory.label}`,
    headline: finding.headline,
    summary: finding.summary,
    confidence: finding.highConfidence ? "high" : "moderate",
    interactive: true,
    stats: [
      {
        label: "Regional rate",
        value: formatPct(finding.regionalRate),
        detail: `${finding.regionalGames} games in territory`,
      },
      {
        label: "Baseline rate",
        value: formatPct(finding.baselineRate),
        detail: `${finding.baselineGames} non-regional games`,
      },
      {
        label: "Delta",
        value: `${formatSigned(finding.deltaPp)} pts`,
        detail: signalLabel,
      },
      {
        label: "Birthplace",
        value: finding.birthplace,
        detail: finding.territory.label,
      },
    ],
  };
}

function passesMarqueeGate(performance: RefMarqueePerformance): boolean {
  if (!passesMarqueeComparisonGate(performance)) return false;
  const overDeltaPp =
    (performance.marqueeOverRate - performance.baselineOverRate) * 100;
  const atsDeltaPp =
    performance.marqueeAtsCoverRate !== null &&
    performance.baselineAtsCoverRate !== null
      ? (performance.marqueeAtsCoverRate - performance.baselineAtsCoverRate) * 100
      : null;
  return (
    Math.abs(overDeltaPp) >= MARQUEE_MIN_DELTA_PP ||
    Math.abs(atsDeltaPp ?? 0) >= MARQUEE_MIN_DELTA_PP
  );
}

function insightFromMarquee(
  performance: RefMarqueePerformance,
  leagueId: LeagueId,
): RefMasterInsight {
  const overDeltaPp =
    (performance.marqueeOverRate - performance.baselineOverRate) * 100;
  const atsDeltaPp =
    performance.marqueeAtsCoverRate !== null &&
    performance.baselineAtsCoverRate !== null
      ? (performance.marqueeAtsCoverRate - performance.baselineAtsCoverRate) * 100
      : null;
  const foulLabel = FOUL_LABELS[leagueId] ?? "Fouls per game";
  const highConfidence =
    performance.marqueeGames >= MARQUEE_CI_MIN_GAMES &&
    performance.overRateCi !== null;

  return {
    id: `marquee-${performance.refSlug}`,
    kind: "marquee-efficiency",
    pillLabel: "Prime-Time Efficiency",
    shortLine: `Marquee O/U ${formatSigned(overDeltaPp)} pts vs baseline`,
    headline: "Prime-time and marquee slate efficiency split",
    summary:
      "High-profile games - national windows, derbies, and capacity venues - compared to this official's general baseline.",
    confidence: highConfidence ? "high" : "moderate",
    interactive: true,
    stats: [
      {
        label: "Marquee games",
        value: String(performance.marqueeGames),
        detail: `${performance.baselineGames} non-marquee baseline`,
      },
      {
        label: "Marquee over rate",
        value: formatPct(performance.marqueeOverRate),
        detail: `Baseline ${formatPct(performance.baselineOverRate)} (${formatSigned(overDeltaPp)} pts)`,
      },
      {
        label: "Marquee ATS cover",
        value:
          performance.marqueeAtsCoverRate !== null
            ? formatPct(performance.marqueeAtsCoverRate)
            : "-",
        detail:
          atsDeltaPp !== null && performance.baselineAtsCoverRate !== null
            ? `Baseline ${formatPct(performance.baselineAtsCoverRate)} (${formatSigned(atsDeltaPp)} pts)`
            : "No closing-line sample",
      },
      {
        label: `Marquee ${foulLabel.toLowerCase()}`,
        value: performance.marqueeAvgFouls.toFixed(1),
        detail: `Baseline ${performance.baselineAvgFouls.toFixed(1)}`,
      },
    ],
    footnote:
      performance.sampleTags.length > 0
        ? `Marquee tags: ${performance.sampleTags.join(" · ")}`
        : undefined,
  };
}

function passesWhistleGate(profile: RefWhistleFatigueProfile): boolean {
  return (
    profile.gamesWithSplits >= WHISTLE_DRIFT_MIN_GAMES &&
    profile.pattern !== "neutral" &&
    Math.abs(profile.lateVsEarlyPct) >= WHISTLE_DRIFT_EXTREME_PCT
  );
}

function insightFromWhistle(profile: RefWhistleFatigueProfile): RefMasterInsight {
  const patternLabel =
    profile.pattern === "fatigue"
      ? "Second-Half Whistle Fatigue"
      : "Late Escalation";

  return {
    id: `whistle-${profile.refSlug}`,
    kind: "whistle-fatigue",
    pillLabel: patternLabel,
    shortLine: `${formatSigned(profile.lateVsEarlyPct)}% ${profile.metricLabel} drift (${profile.latePeriodLabel})`,
    headline: profile.driftHeadline,
    summary: `Period-split tracking across ${profile.gamesWithSplits} games with whistle volume by ${profile.unit}.`,
    confidence:
      profile.gamesWithSplits >= WHISTLE_DRIFT_MIN_GAMES + 8 ? "high" : "moderate",
    interactive: true,
    stats: [
      {
        label: "Drift pattern",
        value: profile.pattern === "fatigue" ? "Fatigue" : "Escalation",
        detail: `${profile.gamesWithSplits} games with splits`,
      },
      {
        label: `${profile.earlyPeriodLabel} avg`,
        value: profile.earlyAvgPerPeriod.toFixed(1),
        detail: `${profile.metricLabel} per early window`,
      },
      {
        label: `${profile.latePeriodLabel} avg`,
        value: profile.lateAvgPerPeriod.toFixed(1),
        detail: `${formatSigned(profile.lateVsEarlyPct)}% vs early`,
      },
      {
        label: "Trend slope",
        value: formatSigned(profile.trendSlope, 2),
        detail: "Negative = easing; positive = tightening",
      },
    ],
  };
}

function insightFromHighLeverage(profile: RefProfile): RefMasterInsight | null {
  const analytics = profile.nflAnalytics;
  if (!analytics?.avgHighLeverageImpactPerGame) return null;
  const delta = analytics.highLeverageImpactDelta ?? 0;
  if (Math.abs(delta) < HIGH_LEVERAGE_MIN_DELTA) return null;

  const direction = delta > 0 ? "elevated" : "suppressed";
  const rateLabel =
    analytics.highLeverageFlagRate !== undefined
      ? `${Math.round(analytics.highLeverageFlagRate * 100)}% high/critical flags`
      : "estimated from flag volume";

  return {
    id: `leverage-${profile.slug}`,
    kind: "high-leverage-penalty",
    pillLabel: "High-Leverage Impact",
    shortLine: `${formatSigned(delta)} leverage impact vs ${LEAGUE_AVG_HIGH_LEVERAGE_IMPACT} league avg`,
    headline: `${direction.charAt(0).toUpperCase()}${direction.slice(1)} game-altering penalty impact`,
    summary:
      "Leverage-weighted scoring uses down, distance, field position, and WPA deltas - not raw flag counts.",
    confidence:
      (analytics.leverageSampleGames ?? 0) >= 20 ? "high" : "moderate",
    interactive: true,
    stats: [
      {
        label: "Impact per game",
        value: String(analytics.avgHighLeverageImpactPerGame),
        detail: `${formatSigned(delta)} vs league baseline`,
      },
      {
        label: "Raw flags/game",
        value: String(analytics.avgFlagsPerGame),
        detail: `${formatSigned(analytics.flagsDelta)} volume delta`,
      },
      {
        label: "High-leverage share",
        value: rateLabel,
        detail:
          analytics.leverageSampleGames !== undefined
            ? `${analytics.leverageSampleGames} PBP-backed games`
            : "PBP sample pending",
      },
    ],
  };
}

function applyInteractionFallback(insights: RefMasterInsight[]): RefMasterInsight[] {
  if (insights.length !== 1) return insights;
  return [{ ...insights[0], interactive: false }];
}

/**
 * Aggregate request-scoped high-confidence anomalies for one official.
 * Reads marquee, whistle-fatigue, and geo modules from the worker isolate store.
 */
export function buildRefMasterInsights(
  leagueId: LeagueId,
  profile: RefProfile,
  stats: RefStatsFile,
  showMetrics = true,
): RefMasterInsight[] {
  if (!showMetrics) return [];

  const insights: RefMasterInsight[] = [];

  for (const geo of computeRefGeoCorrelations(leagueId, profile, stats)) {
    insights.push(insightFromGeo(geo));
  }

  const marquee = computeRefMarqueePerformance(leagueId, profile);
  if (marquee && passesMarqueeGate(marquee)) {
    insights.push(insightFromMarquee(marquee, leagueId));
  }

  const whistle = computeRefWhistleFatigue(leagueId, profile);
  if (whistle && passesWhistleGate(whistle)) {
    insights.push(insightFromWhistle(whistle));
  }

  if (leagueId === "nfl") {
    const leverage = insightFromHighLeverage(profile);
    if (leverage) insights.push(leverage);
  }

  return applyInteractionFallback(
    insights.sort((a, b) => {
      const rank = (row: RefMasterInsight) =>
        row.confidence === "high" ? 2 : 1;
      return rank(b) - rank(a);
    }),
  );
}
