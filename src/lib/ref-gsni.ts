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
import { formatSigned } from "@/lib/stats-utils";
import type {
  MetricProvenance,
  RefProfile,
  RefStatsFile,
  SampleGateStatus,
} from "@/lib/types";

export type GsniHighLeverageSampleTier = "high" | "moderate" | "withheld";

export type RefGsniMetrics = {
  referee_gsni: number | undefined;
  referee_gsni_volatility: number | undefined;
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

  const vsNeutralDetail =
    result.referee_gsni !== undefined
      ? `${formatSigned(result.referee_gsni - 50)} vs 50 neutral`
      : null;

  const volatilityDetail =
    result.referee_gsni_volatility !== undefined
      ? `Per-game spread ${result.referee_gsni_volatility}`
      : null;

  const honestyBanner = gateCleared
    ? null
    : `GSNI needs ${GSNI_GATE}+ high-leverage minutes before we publish a score. This ref has ${result.highLeverageMinutes.toFixed(1)} min across ${result.sampleGames} games.`;

  return {
    referee_gsni: result.referee_gsni,
    referee_gsni_volatility: result.referee_gsni_volatility,
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
