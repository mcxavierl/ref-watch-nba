import {
  classifyNflPenaltySlug,
  classifyPenaltyCode,
  computeContextualLeverageMultiplier,
  isWhistleTaxonomyLeague,
  LEAGUE_DEFAULT_SUBJECTIVE_SHARE,
  LWIS_LEVERAGE_MULTIPLIER,
  splitAggregateWhistleCount,
  type PenaltyDisposition,
  type PenaltyLeverageWeightInput,
  type WhistleTaxonomyLeague,
} from "@/config/penalty-types";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { LeagueId } from "@/lib/leagues";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";
import type {
  NflPenaltyEvent,
  RefGameRecord,
  RefProfile,
  RefStatsFile,
} from "@/lib/types";

/** Formal LWIS aggregation: Σ(|ΔWPA| × LeverageWeight) on subjective whistles. */
export const LWIS_AGGREGATION_FORMULA = "Σ(|ΔWPA| × LeverageWeight)";

/** Default |ΔWPA| proxy when play-level win probability is unavailable. */
export const LWIS_DEFAULT_ABS_WPA_PROXY = 0.025;

/** Trailing sample window for LWIS production surfacing. */
export const LWIS_TRAILING_GAME_WINDOW = 100;

/** Minimum high-leverage subjective events required to surface Impact Score. */
export const LWIS_MIN_HIGH_LEVERAGE_EVENTS = 15;

export type WhistleDispositionMetrics = {
  avgSubjectivePerGame: number;
  subjectiveDelta: number;
  avgAdministrativePerGame: number;
  administrativeDelta: number;
  subjectiveShare: number;
  dispositionSampleGames: number;
  eventBackedGames: number;
  /** Leverage-Weighted Impact Score — Σ(|ΔWPA| × LeverageWeight) on subjective calls. */
  lwis: number;
  lwisPerGame: number;
  subjectiveLwisCalls: number;
  lwisEventBackedGames: number;
  highLeverageEventCount: number;
  lwisGateMet: boolean;
  lwisDelta: number;
  isHighImpactOutlier: boolean;
  lwisZScore: number | null;
  impactScoreSurfaced: boolean;
};

export type LwisOfficialOutlier = {
  refSlug: string;
  refName: string;
  lwis: number;
  lwisPerGame: number;
  peerMean: number;
  peerStdDev: number;
  zScore: number;
  isHighImpact: true;
};

export type WhistleDispositionResearchCard = {
  refSlug: string;
  refName: string;
  administrativePerGame: number;
  administrativeDelta: number;
  lwisPerGame: number;
  lwisDelta: number;
  lwisDivergenceScore: number;
  highLeverageEventCount: number;
  lwisGateMet: boolean;
  eventBackedGames: number;
};

/** LWIS contribution for one subjective whistle: |ΔWPA| × LeverageWeight. */
export function computeSubjectiveEventLwis(
  input: PenaltyLeverageWeightInput,
): number {
  const leverageWeight = computeContextualLeverageMultiplier(input);
  const absWpa =
    input.wpaDelta !== undefined
      ? Math.abs(input.wpaDelta)
      : LWIS_DEFAULT_ABS_WPA_PROXY;
  return round4(absWpa * leverageWeight);
}

export function isHighLeverageSubjectiveEvent(
  input: PenaltyLeverageWeightInput,
): boolean {
  return (
    computeContextualLeverageMultiplier(input) >
    LWIS_LEVERAGE_MULTIPLIER.base
  );
}

export function meetsLwisSurfacingGate(highLeverageEventCount: number): boolean {
  return highLeverageEventCount >= LWIS_MIN_HIGH_LEVERAGE_EVENTS;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function subjectiveLwisFromEvent(
  league: WhistleTaxonomyLeague,
  event: NflPenaltyEvent,
): { lwis: number; isHighLeverage: boolean } {
  const disposition =
    league === "nfl"
      ? classifyNflPenaltySlug(event.type)
      : classifyPenaltyCode(league, event.rawType || event.type);
  if (disposition !== "subjective") {
    return { lwis: 0, isHighLeverage: false };
  }

  const context: PenaltyLeverageWeightInput = {
    down: event.leverage.down,
    quarter: event.leverage.quarter,
    gameSecondsRemaining: event.leverage.gameSecondsRemaining,
    scoreDifferential: event.leverage.scoreDifferential,
    wpBefore: event.leverage.wpBefore,
    wpaDelta: event.leverage.wpaDelta,
  };

  return {
    lwis: computeSubjectiveEventLwis(context),
    isHighLeverage: isHighLeverageSubjectiveEvent(context),
  };
}

function subjectiveLwisFromGame(
  league: WhistleTaxonomyLeague,
  game: {
    totalFouls: number;
    homeFlags?: number;
    awayFlags?: number;
    homeMinors?: number;
    awayMinors?: number;
    penaltyEvents?: NflPenaltyEvent[];
    subjectiveFlags?: number;
    administrativeFlags?: number;
  },
): {
  lwis: number;
  subjectiveCalls: number;
  highLeverageEvents: number;
  eventBacked: boolean;
} {
  if (league === "nfl" && game.penaltyEvents?.length) {
    let lwis = 0;
    let subjectiveCalls = 0;
    let highLeverageEvents = 0;
    for (const event of game.penaltyEvents) {
      if (!event.accepted) continue;
      const contribution = subjectiveLwisFromEvent(league, event);
      if (contribution.lwis <= 0) continue;
      lwis += contribution.lwis;
      subjectiveCalls += 1;
      if (contribution.isHighLeverage) highLeverageEvents += 1;
    }
    return {
      lwis: round4(lwis),
      subjectiveCalls,
      highLeverageEvents,
      eventBacked: true,
    };
  }

  const counts = countDispositionFromGame(league, game);
  const subjectiveCalls = Math.round(counts.subjective);
  if (subjectiveCalls <= 0) {
    return {
      lwis: 0,
      subjectiveCalls: 0,
      highLeverageEvents: 0,
      eventBacked: counts.eventBacked,
    };
  }

  const neutralContext: PenaltyLeverageWeightInput = {
    down: 1,
    gameSecondsRemaining: 900,
    scoreDifferential: 14,
  };
  const perCallLwis = computeSubjectiveEventLwis(neutralContext);
  return {
    lwis: round4(subjectiveCalls * perCallLwis),
    subjectiveCalls,
    highLeverageEvents: 0,
    eventBacked: counts.eventBacked,
  };
}

function trailingSampleGames<T>(games: T[], window = LWIS_TRAILING_GAME_WINDOW): T[] {
  if (games.length <= window) return games;
  return games.slice(-window);
}


function attachLwisOutlierFlags(
  metricsBySlug: Map<string, WhistleDispositionMetrics>,
): void {
  const lwisValues = [...metricsBySlug.values()]
    .map((row) => row.lwisPerGame)
    .filter((value) => value > 0);
  if (lwisValues.length < 5) return;

  const mean =
    lwisValues.reduce((sum, value) => sum + value, 0) / lwisValues.length;
  const variance =
    lwisValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    lwisValues.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev <= 0) return;

  for (const metrics of metricsBySlug.values()) {
    const zScore = (metrics.lwisPerGame - mean) / stdDev;
    metrics.lwisZScore = round1(zScore);
    metrics.isHighImpactOutlier = zScore >= 2;
  }
}

export function identifyHighImpactLwisOutliers(
  stats: RefStatsFile,
  leagueId: LeagueId,
  scopedSeasons: string[],
  minGames = 10,
): LwisOfficialOutlier[] {
  if (!isWhistleTaxonomyLeague(leagueId)) return [];

  const metricsBySlug = new Map<string, WhistleDispositionMetrics>();
  for (const ref of stats.refs) {
    if (ref.games < minGames) continue;
    const metrics = computeRefWhistleDisposition(ref, leagueId, scopedSeasons);
    if (!metrics || !metrics.lwisGateMet || metrics.lwisPerGame <= 0) continue;
    metricsBySlug.set(ref.slug, metrics);
  }

  attachLwisOutlierFlags(metricsBySlug);

  const lwisValues = [...metricsBySlug.values()].map((row) => row.lwisPerGame);
  if (lwisValues.length < 5) return [];

  const mean =
    lwisValues.reduce((sum, value) => sum + value, 0) / lwisValues.length;
  const variance =
    lwisValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    lwisValues.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev <= 0) return [];

  return [...metricsBySlug.entries()]
    .filter(([, metrics]) => metrics.isHighImpactOutlier)
    .map(([slug, metrics]) => {
      const ref = stats.refs.find((row) => row.slug === slug);
      return {
        refSlug: slug,
        refName: ref?.name ?? slug,
        lwis: metrics.lwis,
        lwisPerGame: metrics.lwisPerGame,
        peerMean: round4(mean),
        peerStdDev: round4(stdDev),
        zScore: metrics.lwisZScore ?? 0,
        isHighImpact: true as const,
      };
    })
    .sort((a, b) => b.zScore - a.zScore);
}

export function isHighImpactLwisOfficial(
  profile: RefProfile,
  stats: RefStatsFile,
  leagueId: LeagueId,
  scopedSeasons: string[],
): boolean {
  const outliers = identifyHighImpactLwisOutliers(stats, leagueId, scopedSeasons);
  return outliers.some((row) => row.refSlug === profile.slug);
}

export function resolveRefLwisPeerContext(
  profile: RefProfile,
  stats: RefStatsFile,
  leagueId: LeagueId,
  scopedSeasons: string[],
  metrics: WhistleDispositionMetrics,
): WhistleDispositionMetrics {
  const outlier = identifyHighImpactLwisOutliers(stats, leagueId, scopedSeasons).find(
    (row) => row.refSlug === profile.slug,
  );
  return {
    ...metrics,
    isHighImpactOutlier: Boolean(outlier),
    lwisZScore: outlier?.zScore ?? metrics.lwisZScore,
  };
}

function estimateProfileLwis(
  subjectivePerGame: number,
  games: number,
): Pick<
  WhistleDispositionMetrics,
  | "lwis"
  | "lwisPerGame"
  | "subjectiveLwisCalls"
  | "lwisEventBackedGames"
  | "highLeverageEventCount"
  | "lwisGateMet"
  | "lwisDelta"
  | "impactScoreSurfaced"
> {
  const perCallLwis = computeSubjectiveEventLwis({
    down: 1,
    gameSecondsRemaining: 900,
    scoreDifferential: 14,
  });
  const lwisPerGame = round4(subjectivePerGame * perCallLwis);
  return {
    lwis: round4(lwisPerGame * games),
    lwisPerGame,
    subjectiveLwisCalls: Math.round(subjectivePerGame * games),
    lwisEventBackedGames: 0,
    highLeverageEventCount: 0,
    lwisGateMet: false,
    lwisDelta: 0,
    impactScoreSurfaced: false,
  };
}

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function gameWhistleTotal(
  league: WhistleTaxonomyLeague,
  game: {
    totalFouls: number;
    homeFlags?: number;
    awayFlags?: number;
    homeMinors?: number;
    awayMinors?: number;
  },
): number {
  if (league === "nfl") {
    return (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  if (league === "nhl") {
    return (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  return game.totalFouls;
}

function countDispositionFromNflEvents(events: NflPenaltyEvent[]): {
  subjective: number;
  administrative: number;
} {
  let subjective = 0;
  let administrative = 0;
  for (const event of events) {
    if (!event.accepted) continue;
    const bucket = classifyNflPenaltySlug(event.type);
    if (bucket === "administrative") administrative += 1;
    else subjective += 1;
  }
  return { subjective, administrative };
}

function countDispositionFromGame(
  league: WhistleTaxonomyLeague,
  game: {
    totalFouls: number;
    homeFlags?: number;
    awayFlags?: number;
    homeMinors?: number;
    awayMinors?: number;
    penaltyEvents?: NflPenaltyEvent[];
    subjectiveFlags?: number;
    administrativeFlags?: number;
  },
): { subjective: number; administrative: number; eventBacked: boolean } {
  if (game.subjectiveFlags !== undefined && game.administrativeFlags !== undefined) {
    return {
      subjective: game.subjectiveFlags,
      administrative: game.administrativeFlags,
      eventBacked: true,
    };
  }

  if (league === "nfl" && game.penaltyEvents?.length) {
    const counts = countDispositionFromNflEvents(game.penaltyEvents);
    return { ...counts, eventBacked: true };
  }

  const total = gameWhistleTotal(league, game);
  const split = splitAggregateWhistleCount(league, total);
  return { ...split, eventBacked: false };
}

export function computeGameDispositionCounts(
  league: WhistleTaxonomyLeague,
  game: Parameters<typeof countDispositionFromGame>[1],
): { subjective: number; administrative: number; eventBacked: boolean } {
  return countDispositionFromGame(league, game);
}

export function computeLeagueDispositionBaselines(
  games: Array<Parameters<typeof countDispositionFromGame>[1]>,
  league: WhistleTaxonomyLeague,
): { subjective: number; administrative: number } {
  if (games.length === 0) {
    const share = LEAGUE_DEFAULT_SUBJECTIVE_SHARE[league];
    const avgTotal =
      league === "nfl" ? 13 : league === "nhl" ? 8 : league === "nba" ? 40 : 24;
    return {
      subjective: avgTotal * share,
      administrative: avgTotal * (1 - share),
    };
  }

  let subjectiveTotal = 0;
  let administrativeTotal = 0;
  for (const game of games) {
    const counts = countDispositionFromGame(league, game);
    subjectiveTotal += counts.subjective;
    administrativeTotal += counts.administrative;
  }

  return {
    subjective: subjectiveTotal / games.length,
    administrative: administrativeTotal / games.length,
  };
}

export function computeRefWhistleDispositionFromGames(
  games: Array<Parameters<typeof countDispositionFromGame>[1]>,
  league: WhistleTaxonomyLeague,
  leagueBaselines?: { subjective: number; administrative: number },
  leagueLwisMeanPerGame = 0,
): WhistleDispositionMetrics | null {
  if (games.length < 10) return null;

  const sampleGames = trailingSampleGames(games);
  let subjectiveTotal = 0;
  let administrativeTotal = 0;
  let eventBacked = 0;
  let lwisTotal = 0;
  let subjectiveLwisCalls = 0;
  let lwisEventBacked = 0;
  let highLeverageEventCount = 0;

  for (const game of sampleGames) {
    const counts = countDispositionFromGame(league, game);
    subjectiveTotal += counts.subjective;
    administrativeTotal += counts.administrative;
    if (counts.eventBacked) eventBacked += 1;

    const lwis = subjectiveLwisFromGame(league, game);
    lwisTotal += lwis.lwis;
    subjectiveLwisCalls += lwis.subjectiveCalls;
    highLeverageEventCount += lwis.highLeverageEvents;
    if (lwis.eventBacked) lwisEventBacked += 1;
  }

  const avgSubjectivePerGame = subjectiveTotal / sampleGames.length;
  const avgAdministrativePerGame = administrativeTotal / sampleGames.length;
  const baselines =
    leagueBaselines ?? computeLeagueDispositionBaselines(games, league);
  const lwisPerGame = round4(lwisTotal / sampleGames.length);
  const lwisGateMet = meetsLwisSurfacingGate(highLeverageEventCount);

  return {
    avgSubjectivePerGame: round1(avgSubjectivePerGame),
    subjectiveDelta: round1(avgSubjectivePerGame - baselines.subjective),
    avgAdministrativePerGame: round1(avgAdministrativePerGame),
    administrativeDelta: round1(
      avgAdministrativePerGame - baselines.administrative,
    ),
    subjectiveShare: round3(
      subjectiveTotal / (subjectiveTotal + administrativeTotal || 1),
    ),
    dispositionSampleGames: sampleGames.length,
    eventBackedGames: eventBacked,
    lwis: round4(lwisTotal),
    lwisPerGame,
    subjectiveLwisCalls,
    lwisEventBackedGames: lwisEventBacked,
    highLeverageEventCount,
    lwisGateMet,
    lwisDelta: lwisGateMet ? round4(lwisPerGame - leagueLwisMeanPerGame) : 0,
    isHighImpactOutlier: false,
    lwisZScore: null,
    impactScoreSurfaced: lwisGateMet,
  };
}

export function computeRefWhistleDispositionFromRecords(
  games: RefGameRecord[],
  league: WhistleTaxonomyLeague,
  leagueBaselines?: { subjective: number; administrative: number },
): WhistleDispositionMetrics | null {
  return computeRefWhistleDispositionFromGames(games, league, leagueBaselines);
}

function cacheKey(
  leagueId: LeagueId,
  slug: string,
  scopedSeasons: string[],
): string {
  return [
    "whistle-disposition:v3",
    leagueId,
    slug,
    [...scopedSeasons].sort().join(","),
  ].join("|");
}

/** Request-scoped disposition metrics for one official from runtime game logs. */
export function computeRefWhistleDisposition(
  profile: RefProfile,
  leagueId: LeagueId,
  scopedSeasons: string[],
  leagueBaselines?: { subjective: number; administrative: number },
): WhistleDispositionMetrics | null {
  if (!isWhistleTaxonomyLeague(leagueId)) return null;

  const key = cacheKey(leagueId, profile.slug, scopedSeasons);
  const cached = getWorkerIsolateStore().matrixCompute.get(key);
  if (cached) return cached as WhistleDispositionMetrics;

  const logs = loadRuntimeGameLogs(
    leagueId === "laliga" ? "LALIGA" : leagueId.toUpperCase() as "NBA" | "NFL" | "NHL" | "EPL",
  );
  if (!logs?.games?.length) return null;

  const seasonSet = new Set(scopedSeasons);
  const crewGames = logs.games.filter((game) => {
    if (!seasonSet.has(game.season)) return false;
    return game.officials.some(
      (official) => refSlug(official.name, official.number) === profile.slug,
    );
  });

  const metrics = computeRefWhistleDispositionFromGames(
    crewGames,
    leagueId,
    leagueBaselines,
  );
  if (metrics) {
    getWorkerIsolateStore().matrixCompute.set(key, metrics);
  }
  return metrics;
}

export function profileDisposition(
  profile: RefProfile,
  leagueId: WhistleTaxonomyLeague,
): WhistleDispositionMetrics | null {
  const nfl = profile.nflAnalytics;
  if (
    leagueId === "nfl" &&
    nfl?.avgSubjectiveFlagsPerGame !== undefined &&
    nfl.avgAdministrativeFlagsPerGame !== undefined
  ) {
    const lwis = estimateProfileLwis(
      nfl.avgSubjectiveFlagsPerGame,
      nfl.dispositionSampleGames ?? profile.games,
    );
    return {
      avgSubjectivePerGame: nfl.avgSubjectiveFlagsPerGame,
      subjectiveDelta: nfl.subjectiveFlagsDelta ?? 0,
      avgAdministrativePerGame: nfl.avgAdministrativeFlagsPerGame,
      administrativeDelta: nfl.administrativeFlagsDelta ?? 0,
      subjectiveShare: nfl.subjectiveFlagShare ?? 0.5,
      dispositionSampleGames: nfl.dispositionSampleGames ?? profile.games,
      eventBackedGames: nfl.dispositionEventBackedGames ?? 0,
      ...lwis,
      isHighImpactOutlier: false,
      lwisZScore: null,
    };
  }

  const total =
    leagueId === "nhl"
      ? (profile.nhlAnalytics?.avgMinorsPerGame ?? profile.avgFouls)
      : leagueId === "nfl"
        ? (profile.nflAnalytics?.avgFlagsPerGame ?? profile.avgFouls)
        : profile.avgFouls;

  const split = splitAggregateWhistleCount(leagueId, total);
  const share = LEAGUE_DEFAULT_SUBJECTIVE_SHARE[leagueId];
  const baselineTotal =
    leagueId === "nfl"
      ? 13
      : leagueId === "nhl"
        ? 8
        : leagueId === "nba"
          ? 40
          : 24;
  const baseline = splitAggregateWhistleCount(leagueId, baselineTotal);

  const lwis = estimateProfileLwis(split.subjective, profile.games);

  return {
    avgSubjectivePerGame: round1(split.subjective),
    subjectiveDelta: round1(split.subjective - baseline.subjective),
    avgAdministrativePerGame: round1(split.administrative),
    administrativeDelta: round1(split.administrative - baseline.administrative),
    subjectiveShare: round3(share),
    dispositionSampleGames: profile.games,
    eventBackedGames: 0,
    ...lwis,
    isHighImpactOutlier: false,
    lwisZScore: null,
  };
}

/**
 * Highlight officials whose leverage-weighted subjective impact diverges
 * from league mean — prioritizing outcome-shaping whistles over volume.
 */
export function buildWhistleDispositionResearchCards(
  stats: RefStatsFile,
  leagueId: LeagueId,
  scopedSeasons: string[],
  limit = 4,
): WhistleDispositionResearchCard[] {
  if (!isWhistleTaxonomyLeague(leagueId)) return [];

  const min = Math.min(stats.meta.minSampleSize, 15);
  const logs = loadRuntimeGameLogs(
    leagueId === "laliga" ? "LALIGA" : leagueId.toUpperCase() as "NBA" | "NFL" | "NHL" | "EPL",
  );
  const seasonSet = new Set(scopedSeasons);
  const scopedGames =
    logs?.games.filter((game) => seasonSet.has(game.season)) ?? [];
  const baselines = computeLeagueDispositionBaselines(scopedGames, leagueId);

  const eligible: Array<{
    ref: RefProfile;
    metrics: WhistleDispositionMetrics;
  }> = [];

  for (const ref of stats.refs) {
    if (ref.games < min) continue;

    const metrics =
      computeRefWhistleDisposition(ref, leagueId, scopedSeasons, baselines) ??
      profileDisposition(ref, leagueId);
    if (!metrics || metrics.dispositionSampleGames < 10) continue;
    if (!metrics.lwisGateMet || !metrics.impactScoreSurfaced) continue;

    eligible.push({ ref, metrics });
  }

  if (eligible.length === 0) return [];

  const leagueLwisMean =
    eligible.reduce((sum, row) => sum + row.metrics.lwisPerGame, 0) /
    eligible.length;

  const cards: WhistleDispositionResearchCard[] = eligible.map(({ ref, metrics }) => {
    const lwisDelta = round4(metrics.lwisPerGame - leagueLwisMean);
    return {
      refSlug: ref.slug,
      refName: ref.name,
      administrativePerGame: metrics.avgAdministrativePerGame,
      administrativeDelta: metrics.administrativeDelta,
      lwisPerGame: metrics.lwisPerGame,
      lwisDelta,
      lwisDivergenceScore: lwisDelta,
      highLeverageEventCount: metrics.highLeverageEventCount,
      lwisGateMet: metrics.lwisGateMet,
      eventBackedGames: metrics.eventBackedGames,
    };
  });

  return cards
    .sort((a, b) => b.lwisDivergenceScore - a.lwisDivergenceScore)
    .slice(0, limit);
}

export function classifyRawPenalty(
  league: WhistleTaxonomyLeague,
  rawCode: string,
): PenaltyDisposition {
  return classifyPenaltyCode(league, rawCode);
}
