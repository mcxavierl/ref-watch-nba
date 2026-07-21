import {
  computeRollingWindowStats,
  selectRollingWindowGames,
} from "@/lib/analytics/anomalyEngine";
import {
  consistencyScoreFromWhistleRates,
} from "@/lib/analytics/referee-archetypes";
import type {
  RecalibratedOfficialMetrics,
  RollingWindowBaseline,
  RollingWindowKey,
} from "@/lib/cron/recalibrate-profiles-types";
import { computeRefWhistleFatigue } from "@/lib/whistle-fatigue";
import type { LeagueId } from "@/lib/leagues";
import type { RefGameRecord, RefProfile } from "@/lib/types";

const ROLLING_WINDOWS: RollingWindowKey[] = [
  "last_25_games",
  "last_50_games",
  "current_season",
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function whistleValues(games: RefGameRecord[]): number[] {
  return games.map((game) => game.totalFouls);
}

function consistencyScore100(perGameWhistles: number[]): number {
  const score = consistencyScoreFromWhistleRates(perGameWhistles, 8);
  if (score === null) return 0;
  return Math.max(0, Math.min(100, score * 10));
}

export function buildRollingWindowBaselines(
  games: RefGameRecord[],
  currentSeason?: string,
): RollingWindowBaseline[] {
  const baselines: RollingWindowBaseline[] = [];

  for (const window of ROLLING_WINDOWS) {
    const slice = selectRollingWindowGames(games, window, currentSeason);
    if (slice.length === 0) continue;
    const leagueMean =
      games.reduce((sum, game) => sum + game.totalFouls, 0) / Math.max(games.length, 1);
    const stats = computeRollingWindowStats(slice, window, leagueMean, currentSeason);
    const whistles = whistleValues(slice);
    baselines.push({
      window,
      sampleSize: stats.sampleSize,
      meanFouls: round2(stats.mean),
      stdDev: round2(stats.stdDev),
      consistencyScore: consistencyScore100(whistles),
    });
  }

  return baselines;
}

export function recalibrateOfficialMetrics(
  leagueId: LeagueId,
  profile: RefProfile,
  season: string,
  teamsInGame: string[],
  updatedAt = new Date().toISOString(),
): RecalibratedOfficialMetrics {
  const games = [...profile.recentGames].sort((a, b) => a.date.localeCompare(b.date));
  const rollingWindows = buildRollingWindowBaselines(games, season);
  const whistleDrift = computeRefWhistleFatigue(leagueId, profile);
  const latestConsistency =
    rollingWindows[rollingWindows.length - 1]?.consistencyScore ??
    consistencyScore100(whistleValues(games));

  return {
    leagueId,
    slug: profile.slug,
    updatedAt,
    rollingWindows,
    consistencyScore: latestConsistency,
    whistleDriftDeltaPct: whistleDrift ? round2(whistleDrift.lateVsEarlyPct) : null,
    teamHistoryTeamsUpdated: teamsInGame,
  };
}

export function applyRecalibratedMetricsToProfile(
  profile: RefProfile,
  metrics: RecalibratedOfficialMetrics,
): RefProfile {
  const nextOfficialStats = {
    ...(profile.officialStats ?? {
      primary_archetype: "balanced" as const,
      admin_ratio: 1,
      pressure_sensitive: false,
      pressure_delta_pct: null,
      sample_games: profile.games,
      last_calculated: metrics.updatedAt,
      leverage_index: null,
      leverage_profile: "neutral" as const,
      early_period_foul_rate: null,
      high_pressure_foul_rate: null,
      leverage_sample_games: 0,
      close_game_sample: 0,
      split_backed_games: 0,
    }),
    consistency_score: Math.max(1, Math.min(10, Math.round(metrics.consistencyScore / 10))),
    sample_games: Math.max(profile.games, metrics.rollingWindows.at(-1)?.sampleSize ?? 0),
    last_calculated: metrics.updatedAt,
  };

  return {
    ...profile,
    officialStats: nextOfficialStats,
  };
}
