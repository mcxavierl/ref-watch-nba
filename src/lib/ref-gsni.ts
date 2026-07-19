import {
  shrinkGsni,
  shrunkMetricTooltip,
  type ShrunkMetric,
} from "@/lib/bayesian-shrinkage";
import {
  buildGsniCorpusFromGameLogs,
  computeGSNI,
  GSNI_MIN_HIGH_LEVERAGE_MINUTES,
} from "@/lib/gsni";
import { gameLogsAvailable, loadRuntimeGameLogs } from "@/lib/game-logs";
import type { DataLeague } from "@/lib/game-logs-preload";
import {
  GSNI_MIN_HIGH_LEVERAGE_MINUTES as GSNI_GATE,
  refStatsDataTag,
  sampleGateStatus,
} from "@/lib/provenance";
import { refSlug } from "@/lib/ref-slug";
import { formatGsniZ } from "@/lib/gsni-ui";
import type {
  MetricProvenance,
  RefProfile,
  RefStatsFile,
  SampleGateStatus,
} from "@/lib/types";

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
      return "100+ high-leverage min";
    case "moderate":
      return "50-99 high-leverage min";
    case "withheld":
      return "Below sample gate";
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
): MetricProvenance {
  const tag = refStatsDataTag(meta);
  return {
    tag: gateCleared ? tag : "computed-with-partial-data",
    sampleSize: sampleGames,
    gateThreshold: GSNI_GATE,
    note: gateCleared
      ? "Leverage-weighted foul rate vs league in matched game states."
      : `GSNI withheld until ${GSNI_GATE}+ high-leverage minutes.`,
  };
}

function metricsFromCompute(
  result: ReturnType<typeof computeGSNI>,
  meta: RefStatsFile["meta"],
): RefGsniMetrics {
  const gateCleared =
    result.highLeverageMinutes >= GSNI_MIN_HIGH_LEVERAGE_MINUTES &&
    result.referee_gsni !== undefined;

  const observedGsni = result.referee_gsni;
  const gsniShrinkage =
    observedGsni !== undefined
      ? shrinkGsni(observedGsni, result.highLeverageMinutes)
      : undefined;
  const displayGsni = gsniShrinkage?.shrunk ?? observedGsni;

  const vsNeutralDetail =
    displayGsni !== undefined ? `${formatGsniZ(displayGsni)} from league mean` : null;

  const volatilityDetail =
    result.referee_gsni_volatility !== undefined
      ? `Per-game spread ${result.referee_gsni_volatility}`
      : null;

  const gsniShrinkageTooltip =
    gsniShrinkage !== undefined
      ? shrunkMetricTooltip(gsniShrinkage, { label: "Game-State Index", unit: "σ" })
      : null;

  const honestyBanner = gateCleared
    ? null
    : `Game-State Index needs ${GSNI_GATE}+ high-leverage minutes before we publish a score. This ref has ${result.highLeverageMinutes.toFixed(1)} min across ${result.sampleGames} games.`;

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
    provenance: gsniProvenance(meta, result.sampleGames, gateCleared),
    sampleGate: sampleGateStatus(
      Math.floor(result.highLeverageMinutes),
      GSNI_GATE,
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
    highLeverageMinutes >= GSNI_MIN_HIGH_LEVERAGE_MINUTES &&
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
  if (league !== "NFL") return null;

  if (profile) {
    const fromProfile = metricsFromProfile(profile, meta);
    if (fromProfile) return fromProfile;
  }

  if (!gameLogsAvailable(league)) return null;

  const logs = loadRuntimeGameLogs(league);
  if (!logs?.games.length) return null;

  const corpus = buildGsniCorpusFromGameLogs(logs.games, (official) =>
    refSlug(official.name, official.number),
  );
  const result = computeGSNI(refSlugValue, corpus);
  return metricsFromCompute(result, meta);
}
