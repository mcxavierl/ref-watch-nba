import {
  dataMaturityScore,
  dataMaturityTier,
  dataMaturityTierShortLabel,
  type DataMaturityTier,
} from "@/lib/data-maturity";
import type { LeagueConfig } from "@/lib/leagues";
import type { RefGameRecord, RefProfile } from "@/lib/types";
import { formatSigned } from "@/lib/stats-utils";

export const PREVIEW_RECENT_GAME_COUNT = 5;

export type PreviewSparklinePoint = {
  gameId: string;
  label: string;
  value: number;
};

export function metricHonestyHint(input: {
  sampleSize: number;
  leagueAvg?: number;
  leagueAvgLabel?: string;
  effectMagnitude?: number;
}): string {
  const tier = dataMaturityTier(
    dataMaturityScore(input.sampleSize, input.effectMagnitude ?? 0),
  );
  const parts = [`Sample Size: ${input.sampleSize} Games`];
  if (input.leagueAvg !== undefined && Number.isFinite(input.leagueAvg)) {
    const label = input.leagueAvgLabel ?? "League Avg";
    parts.push(`${label}: ${input.leagueAvg}`);
  }
  parts.push(`Data Maturity: ${dataMaturityTierShortLabel(tier)}`);
  return parts.join(" | ");
}

export function previewDataMaturityTier(
  sampleSize: number,
  effectMagnitude = 0,
): DataMaturityTier {
  return dataMaturityTier(dataMaturityScore(sampleSize, effectMagnitude));
}

function whistleVolumeForGame(
  game: RefGameRecord,
  league: LeagueConfig,
): number {
  if (league.whistleFromMinors) {
    return (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  if (league.id === "nfl" || league.id === "cfb") {
    return (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  return game.totalFouls;
}

export function buildWhistleSparklineSeries(
  recentGames: readonly RefGameRecord[],
  league: LeagueConfig,
  limit = PREVIEW_RECENT_GAME_COUNT,
): PreviewSparklinePoint[] {
  const ordered = [...recentGames]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);
  return ordered.map((game) => ({
    gameId: game.gameId,
    label: `${game.awayTeam} @ ${game.homeTeam}`,
    value: whistleVolumeForGame(game, league),
  }));
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** 3–4 sentence season trend copy for the profile preview drawer. */
export function buildRefPreviewQuickSummary(input: {
  profile: RefProfile;
  league: LeagueConfig;
  leagueAvgFouls: number;
  leagueAvgTotal: number;
}): string {
  const { profile, league, leagueAvgFouls, leagueAvgTotal } = input;
  const whistle = league.metrics.whistlePlain;
  const scoreUnit = league.metrics.scoreUnitPlural;
  const currentSeason =
    profile.seasons.length > 0
      ? profile.seasons[profile.seasons.length - 1]
      : "the current sample";
  const recent = profile.recentGames.slice(0, PREVIEW_RECENT_GAME_COUNT);
  const recentWhistle = recent.map((g) => whistleVolumeForGame(g, league));
  const recentVolatility = stdDev(recentWhistle);
  const leagueWhistleDelta = profile.foulsDelta;
  const scoringDelta = profile.totalPointsDelta;

  const sentences: string[] = [];

  sentences.push(
    `${profile.name} has ${profile.games.toLocaleString()} verified games in ${currentSeason}, averaging ${profile.avgFouls} ${whistle} and ${profile.avgTotalPoints} combined ${scoreUnit} per outing.`,
  );

  if (Math.abs(leagueWhistleDelta) >= 1.5) {
    const direction = leagueWhistleDelta > 0 ? "above" : "below";
    sentences.push(
      `Whistle volume runs ${formatSigned(leagueWhistleDelta)} ${direction} the ${leagueAvgFouls.toFixed(1)} league baseline, a measurable deviation in ${whistle} pace.`,
    );
  } else {
    sentences.push(
      `Whistle volume tracks near the ${leagueAvgFouls.toFixed(1)} league baseline (${formatSigned(leagueWhistleDelta)} delta), suggesting a stable ${whistle} profile.`,
    );
  }

  if (recentWhistle.length >= 3 && recentVolatility >= 4) {
    sentences.push(
      `The last ${recentWhistle.length} assignments show elevated ${whistle} volatility (σ ≈ ${recentVolatility.toFixed(1)}), with game-to-game swings worth monitoring.`,
    );
  } else if (Math.abs(scoringDelta) >= (league.id === "nhl" ? 0.35 : 1.5)) {
    const scoringDir = scoringDelta > 0 ? "higher" : "lower";
    sentences.push(
      `Combined scoring trends ${scoringDir} than the ${leagueAvgTotal} league average (${formatSigned(scoringDelta)} ${scoreUnit}), with ${formatPctSafe(profile.overRate)} of recent games clearing the over benchmark.`,
    );
  } else {
    const highLeverageGames = recent.filter(
      (g) => (g.highLeverageFlagRate ?? 0) >= 0.35 || (g.highLeverageImpact ?? 0) >= 8,
    );
    if (highLeverageGames.length >= 2) {
      sentences.push(
        `Recent crews show repeated high-leverage whistle activity in ${highLeverageGames.length} of the last ${recent.length} games, including several late-game penalty clusters.`,
      );
    } else {
      sentences.push(
        `Recent form looks balanced across scoring and whistle metrics, with no extreme leverage spikes in the latest ${recent.length || "logged"} assignments.`,
      );
    }
  }

  if (sentences.length < 4 && Math.abs(scoringDelta) >= (league.id === "nhl" ? 0.35 : 1.5)) {
    sentences.push(
      `Scoring context: combined output sits ${formatSigned(scoringDelta)} vs the ${leagueAvgTotal} league average across this sample.`,
    );
  }

  return sentences.slice(0, 4).join(" ");
}

function formatPctSafe(rate: number): string {
  if (!Number.isFinite(rate)) return "n/a";
  return `${Math.round(rate * 1000) / 10}%`;
}
