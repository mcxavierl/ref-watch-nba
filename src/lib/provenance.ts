import { baselineUsingFallback, resolveLeagueBaseline } from "@/lib/baselines";
import type {
  EplRefAnalytics,
  NflRefAnalytics,
  CrewHomeBias,
  CrewWhistlePremium,
  MetricProvenance,
  NhlOtRateSignal,
  NhlPpPremiumSignal,
  NhlRefAnalytics,
  ProvenanceTag,
  RefBettingStats,
  RefProfile,
  RefStatsFile,
  SampleGateStatus,
} from "@/lib/types";

export type { MetricProvenance, ProvenanceTag, SampleGateStatus };
export {
  isEstimatedTag,
  isFallbackMetric,
  provenanceLabel,
} from "@/lib/provenance-utils";
const NHL_ANALYTICS_MIN_GAMES = 10;
const NFL_ANALYTICS_MIN_GAMES = 10;
const PP_PREMIUM_MIN_REF_GAMES = 25;
const HOME_BIAS_MIN_GAMES = 4;

const MIN_QUALIFIED_CREW_REFS = 2;

export function sampleGateStatus(
  sampleSize: number,
  gateThreshold: number,
): SampleGateStatus {
  const cleared = sampleSize >= gateThreshold;
  return {
    sampleSize,
    gateThreshold,
    cleared,
    label: cleared
      ? `${sampleSize}/${gateThreshold} games, gate cleared`
      : `${sampleSize}/${gateThreshold} games, below threshold`,
  };
}

export function refStatsDataTag(meta: RefStatsFile["meta"]): ProvenanceTag {
  if (
    meta.source === "nba-stats-api" ||
    meta.source === "nhl-api" ||
    meta.source === "espn" ||
    meta.source === "seeded"
  ) {
    return "computed-from-real";
  }
  return "fallback-constant";
}

export function bettingLinesTag(
  meta: RefStatsFile["meta"],
  linesAvailable: boolean,
): ProvenanceTag {
  if (!linesAvailable) return "fallback-constant";
  const dataTag = refStatsDataTag(meta);
  if (dataTag === "computed-from-real" && meta.atsAvailable) {
    return "computed-from-real";
  }
  if (dataTag === "computed-with-partial-data") {
    return "computed-with-partial-data";
  }
  return "fallback-constant";
}

export function baselineProvenance(
  league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB" | "EPL",
  season?: string | null,
): MetricProvenance {
  const resolved = resolveLeagueBaseline(league, season);
  return {
    tag:
      resolved.source === "computed"
        ? "computed-from-real"
        : "fallback-constant",
    note:
      resolved.source === "computed"
        ? `League baseline from ${resolved.season ?? "season"} game logs.`
        : "Static league fallback; run npm run compute-baselines after game logs exist.",
  };
}

export function metricFromTag(
  tag: ProvenanceTag,
  opts?: Partial<MetricProvenance>,
): MetricProvenance {
  return { tag, ...opts };
}

export function crewMetricsProvenance(
  stats: RefStatsFile,
  qualifiedCount: number,
  poolGames: number,
  minSample: number,
): {
  aggregate: MetricProvenance;
  scoring: MetricProvenance;
  fouls: MetricProvenance;
  overRate: MetricProvenance;
  sampleGate: SampleGateStatus;
} {
  const dataTag = refStatsDataTag(stats.meta);
  const baseline = baselineProvenance("NBA");
  const gate = sampleGateStatus(poolGames, minSample);
  const partialBecauseSample =
    qualifiedCount < MIN_QUALIFIED_CREW_REFS ? "computed-with-partial-data" : dataTag;

  return {
    aggregate: metricFromTag(partialBecauseSample, {
      sampleSize: poolGames,
      gateThreshold: minSample,
      note: gate.cleared
        ? "Crew average from qualified ref histories."
        : "Crew pool below qualified-ref minimum; treat as directional only.",
    }),
    scoring: metricFromTag(partialBecauseSample, {
      sampleSize: poolGames,
      gateThreshold: minSample,
    }),
    fouls: metricFromTag(partialBecauseSample, {
      sampleSize: poolGames,
      gateThreshold: minSample,
    }),
    overRate: metricFromTag(
      baseline.tag === "fallback-constant" ? "fallback-constant" : partialBecauseSample,
      {
        sampleSize: poolGames,
        gateThreshold: minSample,
        note:
          baseline.tag === "fallback-constant"
            ? "Over rate vs static league proxy, not closing lines."
            : undefined,
      },
    ),
    sampleGate: gate,
  };
}

export function crewWhistlePremiumProvenance(
  premium: CrewWhistlePremium,
  stats: RefStatsFile,
  minSample: number,
): CrewWhistlePremium["provenance"] {
  void minSample;
  const dataTag = refStatsDataTag(stats.meta);
  const baseline = baselineProvenance("NBA");
  const benchmarkTag: ProvenanceTag =
    premium.benchmarkSource === "sportsbook"
      ? "computed-from-real"
      : baseline.tag;

  const alertTag: ProvenanceTag =
    premium.sampleQuality === "weak" || premium.qualifiedRefCount < MIN_QUALIFIED_CREW_REFS
      ? "computed-with-partial-data"
      : premium.alert
        ? dataTag
        : "computed-with-partial-data";

  return {
    scoringPremium: metricFromTag(dataTag, {
      sampleSize: premium.qualifiedRefCount,
      gateThreshold: MIN_QUALIFIED_CREW_REFS,
    }),
    gapVsBenchmark: metricFromTag(benchmarkTag, {
      note:
        premium.benchmarkSource === "sportsbook"
          ? "Gap vs sportsbook closing total."
          : "Gap vs league baseline proxy.",
    }),
    alert: metricFromTag(alertTag, {
      sampleSize: premium.qualifiedRefCount,
      gateThreshold: MIN_QUALIFIED_CREW_REFS,
      note: premium.alertReason ?? undefined,
    }),
    sampleGate: sampleGateStatus(
      premium.qualifiedRefCount,
      MIN_QUALIFIED_CREW_REFS,
    ),
    benchmark: metricFromTag(benchmarkTag),
  };
}

export function attachWhistlePremiumProvenance(
  premium: CrewWhistlePremium,
  stats: RefStatsFile,
): CrewWhistlePremium {
  const league: "NBA" | "NHL" | "NFL" =
    stats.meta.leagueAvgMinors !== undefined ? "NHL" : "NBA";
  return {
    ...premium,
    provenance:
      league === "NHL"
        ? nhlWhistlePremiumProvenance(premium, stats)
        : crewWhistlePremiumProvenance(
            premium,
            stats,
            stats.meta.minSampleSize,
          ),
  };
}

export function nhlCrewMetricsProvenance(
  stats: RefStatsFile,
  qualifiedCount: number,
  poolGames: number,
): ReturnType<typeof crewMetricsProvenance> {
  return crewMetricsProvenance(
    stats,
    qualifiedCount,
    poolGames,
    stats.meta.minSampleSize,
  );
}

export function nhlWhistlePremiumProvenance(
  premium: CrewWhistlePremium,
  stats: RefStatsFile,
): CrewWhistlePremium["provenance"] {
  return crewWhistlePremiumProvenance(
    premium,
    stats,
    stats.meta.minSampleSize,
  );
}

export function ppPremiumProvenance(
  signal: NhlPpPremiumSignal,
  stats: RefStatsFile,
): NhlPpPremiumSignal["provenance"] {
  const dataTag = refStatsDataTag(stats.meta);
  const minorsBaseline = baselineProvenance("NHL");
  return {
    index: metricFromTag(dataTag, {
      sampleSize: signal.sampleGames,
      gateThreshold: PP_PREMIUM_MIN_REF_GAMES,
    }),
    refMinorRate: metricFromTag(dataTag, {
      sampleSize: signal.sampleGames,
      gateThreshold: PP_PREMIUM_MIN_REF_GAMES,
    }),
    specialTeamsEdge: metricFromTag("computed-with-partial-data", {
      note: "Season PP/PK snapshot, not walk-forward.",
    }),
    sampleGate: sampleGateStatus(signal.sampleGames, PP_PREMIUM_MIN_REF_GAMES),
    minorsBaseline: minorsBaseline,
  };
}

export function otRateProvenance(
  signal: NhlOtRateSignal,
  stats: RefStatsFile,
): NhlOtRateSignal["provenance"] {
  const dataTag = refStatsDataTag(stats.meta);
  return {
    refereeOtRate: metricFromTag(dataTag, {
      sampleSize: signal.sampleGames,
      gateThreshold: PP_PREMIUM_MIN_REF_GAMES,
    }),
    sampleGate: sampleGateStatus(signal.sampleGames, PP_PREMIUM_MIN_REF_GAMES),
  };
}

export function homeBiasProvenance(
  bias: CrewHomeBias,
  stats: RefStatsFile,
): CrewHomeBias["provenance"] {
  const dataTag = refStatsDataTag(stats.meta);
  return {
    aggregate: metricFromTag(dataTag, {
      sampleSize: bias.sampleGames,
      gateThreshold: HOME_BIAS_MIN_GAMES,
    }),
    sampleGate: sampleGateStatus(bias.sampleGames, HOME_BIAS_MIN_GAMES),
  };
}

export function refBettingStatsProvenance(
  profile: RefProfile,
  stats: RefBettingStats,
  meta: RefStatsFile["meta"],
): RefBettingStats["provenance"] {
  const linesTag = bettingLinesTag(meta, stats.linesAvailable);
  const bucketGate = Math.max(5, Math.floor(profile.games * 0.05));
  return {
    aggregate: metricFromTag(linesTag, {
      sampleSize: profile.games,
      gateThreshold: meta.minSampleSize,
    }),
    homeTeamAts: metricFromTag(linesTag, { sampleSize: profile.games }),
    overUnder: metricFromTag(linesTag, { sampleSize: profile.games }),
    spreadBuckets: metricFromTag(linesTag, { sampleSize: profile.games }),
    lines: metricFromTag(linesTag, {
      note: stats.linesAvailable
        ? meta.note
        : "No closing lines on file; ATS/O/U unavailable.",
    }),
    bucketGateThreshold: bucketGate,
  };
}

export function enrichBettingStats(
  profile: RefProfile,
  meta: RefStatsFile["meta"],
): RefBettingStats | undefined {
  if (!profile.bettingStats) return undefined;
  return {
    ...profile.bettingStats,
    provenance: refBettingStatsProvenance(profile, profile.bettingStats, meta),
  };
}

export function nhlRefAnalyticsProvenance(
  profile: RefProfile,
  analytics: NhlRefAnalytics,
  meta: RefStatsFile["meta"],
): NhlRefAnalytics["provenance"] {
  const dataTag = refStatsDataTag(meta);
  const minorsBaseline = baselineProvenance("NHL");
  const gate = sampleGateStatus(profile.games, NHL_ANALYTICS_MIN_GAMES);

  return {
    avgMinorsPerGame: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NHL_ANALYTICS_MIN_GAMES,
    }),
    overtimeRate: metricFromTag(dataTag, {
      sampleSize: analytics.overtimeGames,
      gateThreshold: NHL_ANALYTICS_MIN_GAMES,
    }),
    penaltyBalance: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NHL_ANALYTICS_MIN_GAMES,
    }),
    minorsBaseline: minorsBaseline,
    sampleGate: gate,
  };
}

export function refProfileCoreProvenance(
  profile: RefProfile,
  meta: RefStatsFile["meta"],
): RefProfile["provenance"] {
  const dataTag = refStatsDataTag(meta);
  const baseline = baselineProvenance(
    meta.leagueAvgPenaltyYards !== undefined ? "NFL" : meta.leagueAvgMinors !== undefined ? "NHL" : "NBA",
  );
  const gate = sampleGateStatus(profile.games, meta.minSampleSize);
  const overRateTag: ProvenanceTag =
    baseline.tag === "fallback-constant" ? "fallback-constant" : dataTag;

  return {
    avgTotalPoints: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: meta.minSampleSize,
    }),
    overRate: metricFromTag(overRateTag, {
      sampleSize: profile.games,
      gateThreshold: meta.minSampleSize,
    }),
    avgFouls: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: meta.minSampleSize,
    }),
    sampleGate: gate,
    leagueBaseline: baseline,
  };
}

export interface DataConfidenceSummary {
  real: number;
  partial: number;
  estimated: number;
  total: number;
}

export function summarizeProvenance(
  tags: ProvenanceTag[],
): DataConfidenceSummary {
  const summary: DataConfidenceSummary = {
    real: 0,
    partial: 0,
    estimated: 0,
    total: tags.length,
  };
  for (const tag of tags) {
    if (tag === "computed-from-real") summary.real++;
    else if (tag === "computed-with-partial-data") summary.partial++;
    else summary.estimated++;
  }
  return summary;
}

export function collectSlateProvenance(
  metricsList: { provenance?: { aggregate: MetricProvenance } }[],
  premiums: CrewWhistlePremium[],
  homeBias: (CrewHomeBias | null)[],
  nhlSignals?: {
    ppPremiums: NhlPpPremiumSignal[];
    otSignals: NhlOtRateSignal[];
  },
): DataConfidenceSummary {
  const tags: ProvenanceTag[] = [];
  for (const m of metricsList) {
    if (m.provenance) tags.push(m.provenance.aggregate.tag);
  }
  for (const p of premiums) {
    if (p.provenance) {
      tags.push(p.provenance.scoringPremium.tag);
      tags.push(p.provenance.gapVsBenchmark.tag);
    }
  }
  for (const b of homeBias) {
    if (b?.provenance) tags.push(b.provenance.aggregate.tag);
  }
  if (nhlSignals) {
    for (const pp of nhlSignals.ppPremiums) {
      if (pp.provenance) tags.push(pp.provenance.index.tag);
    }
    for (const ot of nhlSignals.otSignals) {
      if (ot.provenance) tags.push(ot.provenance.refereeOtRate.tag);
    }
  }
  return summarizeProvenance(tags);
}

export function leagueUsesFallbackBaseline(league: "NBA" | "NHL" | "NFL"): boolean {
  return baselineUsingFallback(league);
}

export function nflCrewMetricsProvenance(stats:RefStatsFile,qualifiedCount:number,poolGames:number){return crewMetricsProvenance(stats,qualifiedCount,poolGames,stats.meta.minSampleSize);}
export function cbbCrewMetricsProvenance(stats:RefStatsFile,qualifiedCount:number,poolGames:number){return crewMetricsProvenance(stats,qualifiedCount,poolGames,stats.meta.minSampleSize);}
export function cfbCrewMetricsProvenance(stats:RefStatsFile,qualifiedCount:number,poolGames:number){return crewMetricsProvenance(stats,qualifiedCount,poolGames,stats.meta.minSampleSize);}
export function eplCrewMetricsProvenance(stats:RefStatsFile,qualifiedCount:number,poolGames:number){return crewMetricsProvenance(stats,qualifiedCount,poolGames,stats.meta.minSampleSize);}
export function nflRefAnalyticsProvenance(
  profile: RefProfile,
  analytics: NflRefAnalytics,
  meta: RefStatsFile["meta"],
): NflRefAnalytics["provenance"] {
  const dataTag = refStatsDataTag(meta);
  const flagsBaseline = baselineProvenance("NFL");
  const gate = sampleGateStatus(profile.games, NFL_ANALYTICS_MIN_GAMES);
  return {
    avgFlagsPerGame: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NFL_ANALYTICS_MIN_GAMES,
    }),
    penaltyYards: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NFL_ANALYTICS_MIN_GAMES,
    }),
    penaltyBalance: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NFL_ANALYTICS_MIN_GAMES,
    }),
    flagsBaseline,
    sampleGate: gate,
  };
}

export function cfbRefAnalyticsProvenance(
  profile: RefProfile,
  analytics: NflRefAnalytics,
  meta: RefStatsFile["meta"],
): NflRefAnalytics["provenance"] {
  return nflRefAnalyticsProvenance(profile, analytics, meta);
}

export function eplRefAnalyticsProvenance(
  profile: RefProfile,
  analytics: EplRefAnalytics,
  meta: RefStatsFile["meta"],
): EplRefAnalytics["provenance"] {
  const dataTag = refStatsDataTag(meta);
  const foulsBaseline = baselineProvenance("EPL");
  const gate = sampleGateStatus(profile.games, NFL_ANALYTICS_MIN_GAMES);
  return {
    avgFoulsPerGame: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NFL_ANALYTICS_MIN_GAMES,
    }),
    avgYellowCardsPerGame: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NFL_ANALYTICS_MIN_GAMES,
    }),
    avgRedCardsPerGame: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NFL_ANALYTICS_MIN_GAMES,
    }),
    avgPenaltiesPerGame: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NFL_ANALYTICS_MIN_GAMES,
    }),
    cardBalance: metricFromTag(dataTag, {
      sampleSize: profile.games,
      gateThreshold: NFL_ANALYTICS_MIN_GAMES,
    }),
    foulsBaseline,
    sampleGate: gate,
  };
}
