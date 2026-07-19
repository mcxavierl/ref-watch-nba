import {
  shrinkGsni,
  type ShrunkMetric,
} from "@/lib/bayesian-shrinkage";
import {
  buildGsniCorpusFromGameLogs,
  computeGSNI,
  GSNI_MIN_HIGH_LEVERAGE_MINUTES,
  GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL,
} from "@/lib/gsni";
import { gameLogsAvailable, loadRuntimeGameLogs } from "@/lib/game-logs";
import type { DataLeague } from "@/lib/game-logs-preload";
import { GSNI_INSUFFICIENT_DATA_LABEL } from "@/lib/gsni-display";
import {
  GSNI_MIN_HIGH_LEVERAGE_MINUTES as GSNI_GATE,
  refStatsDataTag,
  sampleGateStatus,
} from "@/lib/provenance";
import { refSlug } from "@/lib/ref-slug";
import { formatGsniIndexScore } from "@/lib/gsni-ui";
import type {
  MetricProvenance,
  RefProfile,
  RefStatsFile,
  SampleGateStatus,
} from "@/lib/types";

const GSNI_DATA_LEAGUES: DataLeague[] = ["NFL", "NBA"];

function gsniGateForLeague(league: DataLeague): number {
  if (league === "NFL") return GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL;
  return GSNI_MIN_HIGH_LEVERAGE_MINUTES;
}

export type GsniHighLeverageSampleTier = "high" | "moderate" | "withheld";

export type RefGsniMetrics = {
  /** Shrunk GSNI shown in the UI. */
  referee_gsni: number | undefined;
  /** Raw observed GSNI before empirical-Bayes shrinkage. */
  referee_gsni_observed: number | undefined;
  referee_gsni_volatility: number | undefined;
  gsniShrinkage: ShrunkMetric | undefined;
  gsniShrinkageTooltip: string | null;
  highLeverageMinutes: number;
  sampleGames: number;
  gateCleared: boolean;
  honestyBanner: string | null;
  provenance: MetricProvenance;
  sampleGate: SampleGateStatus;
  vsNeutralDetail: string | null;
  volatilityDetail: string | null;
  source: string;
  lastUpdated: string;
};

export function gsniHighLeverageSampleTier(
  minutes: number,
): GsniHighLeverageSampleTier {
  if (minutes < GSNI_GATE) return "withheld";
  if (minutes >= 100) return "high";
  return "moderate";
}

export function gsniHighLeverageSampleLabel(tier: GsniHighLeverageSampleTier): string {
  switch (tier) {
    case "high":
      return "100+ high-leverage minutes";
    case "moderate":
      return "50-99 high-leverage minutes";
    case "withheld":
      return GSNI_INSUFFICIENT_DATA_LABEL;
  }
}

/** Maps high-leverage sample depth to a confidence tier for GSNI context pills. */
export function gsniConfidenceLabel(minutes: number): "Low" | "Med" | "High" {
  const tier = gsniHighLeverageSampleTier(minutes);
  if (tier === "high") return "High";
  if (tier === "moderate") return "Med";
  return "Low";
}

function gsniProvenance(
  meta: RefStatsFile["meta"],
  sampleGames: number,
  gateCleared: boolean,
  gateThreshold: number,
): MetricProvenance {
  const tag = refStatsDataTag(meta);
  return {
    tag: gateCleared ? tag : "computed-with-partial-data",
    sampleSize: sampleGames,
    gateThreshold,
    note: gateCleared
      ? "Historical penalty frequency vs league average in matched high-leverage situations."
      : `${GSNI_INSUFFICIENT_DATA_LABEL} until ${gateThreshold}+ high-leverage minutes.`,
  };
}

function metricsFromCompute(
  result: ReturnType<typeof computeGSNI>,
  meta: RefStatsFile["meta"],
  gateThreshold: number,
): RefGsniMetrics {
  const gateCleared =
    result.highLeverageMinutes >= gateThreshold &&
    result.referee_gsni !== undefined;

  const observedGsni = result.referee_gsni;
  const gsniShrinkage =
    observedGsni !== undefined
      ? shrinkGsni(observedGsni, result.highLeverageMinutes)
      : undefined;
  const displayGsni = gsniShrinkage?.shrunk ?? observedGsni;

  const vsNeutralDetail =
    displayGsni !== undefined ? `${formatGsniIndexScore(displayGsni)} vs league average` : null;

  const volatilityDetail =
    result.referee_gsni_volatility !== undefined
      ? `Data consistency spread ${result.referee_gsni_volatility}`
      : null;

  const gsniShrinkageTooltip =
    gsniShrinkage !== undefined
      ? [
          `Game-State Index: ${formatGsniIndexScore(gsniShrinkage.shrunk)} (adjusted estimate).`,
          `Observed index score: ${formatGsniIndexScore(gsniShrinkage.observed)}.`,
          `League average baseline: ${formatGsniIndexScore(gsniShrinkage.prior)}.`,
          `Sample weight ${gsniShrinkage.lambda.toFixed(2)} from ${gsniShrinkage.sampleN} high-leverage minutes.`,
        ].join(" ")
      : null;

  const honestyBanner = gateCleared
    ? null
    : `${GSNI_INSUFFICIENT_DATA_LABEL}. This official has ${result.highLeverageMinutes.toFixed(1)} high-leverage minutes across ${result.sampleGames} games; ${gateThreshold}+ minutes are required before we publish an index score.`;

  return {
    referee_gsni: displayGsni,
    referee_gsni_observed: observedGsni,
    referee_gsni_volatility: result.referee_gsni_volatility,
    gsniShrinkage,
    gsniShrinkageTooltip,
    highLeverageMinutes: result.highLeverageMinutes,
    sampleGames: result.sampleGames,
    gateCleared,
    honestyBanner,
    provenance: gsniProvenance(meta, result.sampleGames, gateCleared, gateThreshold),
    sampleGate: sampleGateStatus(
      Math.floor(result.highLeverageMinutes),
      gateThreshold,
    ),
    vsNeutralDetail,
    volatilityDetail,
    source: meta.source,
    lastUpdated: meta.lastUpdated,
  };
}

function metricsFromProfile(
  profile: Pick<
    RefProfile,
    | "referee_gsni"
    | "referee_gsni_volatility"
    | "gsniHighLeverageMinutes"
    | "gsniSampleGames"
  >,
  meta: RefStatsFile["meta"],
  gateThreshold: number,
): RefGsniMetrics | null {
  if (
    profile.gsniHighLeverageMinutes === undefined &&
    profile.referee_gsni === undefined
  ) {
    return null;
  }

  const highLeverageMinutes = profile.gsniHighLeverageMinutes ?? 0;
  const sampleGames = profile.gsniSampleGames ?? 0;
  const gateCleared =
    highLeverageMinutes >= gateThreshold &&
    profile.referee_gsni !== undefined;

  return metricsFromCompute(
    {
      referee_gsni: profile.referee_gsni,
      referee_gsni_volatility: profile.referee_gsni_volatility,
      highLeverageMinutes,
      sampleGames,
      weightedFoulRate: undefined,
      leagueWeightedFoulRate: undefined,
    },
    meta,
    gateThreshold,
  );
}

export function computeRefGsniMetrics(
  refSlugValue: string,
  meta: RefStatsFile["meta"],
  league: DataLeague,
  profile?: Pick<
    RefProfile,
    | "referee_gsni"
    | "referee_gsni_volatility"
    | "gsniHighLeverageMinutes"
    | "gsniSampleGames"
  >,
): RefGsniMetrics | null {
  if (!GSNI_DATA_LEAGUES.includes(league)) return null;

  const gateThreshold = gsniGateForLeague(league);

  if (profile) {
    const fromProfile = metricsFromProfile(profile, meta, gateThreshold);
    if (fromProfile) return fromProfile;
  }

  if (!gameLogsAvailable(league)) return null;

  const logs = loadRuntimeGameLogs(league);
  if (!logs?.games.length) return null;

  const corpus = buildGsniCorpusFromGameLogs(logs.games, (official) =>
    refSlug(official.name, official.number),
  );
  const result = computeGSNI(refSlugValue, corpus, {
    minHighLeverageMinutes: gateThreshold,
  });
  return metricsFromCompute(result, meta, gateThreshold);
}
