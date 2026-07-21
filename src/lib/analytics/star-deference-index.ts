import type { LeagueId } from "@/lib/leagues";
import type { StarPlayerProfile } from "@/lib/personnel-profiles";
import type { PlayerFoulSnapshot, GamePersonnelSnapshot } from "@/lib/personnel-types";
import { formatSigned } from "@/lib/stats-utils";

export const STAR_USAGE_RATE_THRESHOLD = 0.28;
export const STAR_MIN_PLAYER_OBSERVATIONS = 8;
export const STAR_MIN_UNIQUE_PLAYERS = 2;
export const STAR_SAMPLE_WINDOW = 80;
export const DEFAULT_STAR_MINUTES = 32;
export const ROTATION_USAGE_RANK_MAX = 8;

export const STAR_DEFERENCE_METHOD_NOTE =
  "Star Deference Index compares drawn-foul rates for high-usage and All-Star tier players under this official to each player's league-wide baseline. Team-level proxies apply until full player box scores are ingested.";

export type StarClassification = "star" | "rotation";

export type StarDeferenceGameInput = {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  totalFouls: number;
  homeFouls?: number;
  awayFouls?: number;
  homeFlags?: number;
  awayFlags?: number;
  homeMinors?: number;
  awayMinors?: number;
  officials: { name: string; number: number }[];
  personnel?: GamePersonnelSnapshot;
};

export type StarDeferenceIndexResult = {
  star_deference_index: number | null;
  star_deference_display: string | null;
  star_drawn_rate_delta: number | null;
  rotation_foul_rate_delta: number | null;
  star_player_observations: number;
  star_sample_games: number;
  star_unique_players: number;
  method_note: string;
  data_quality: "ok" | "insufficient";
};

type ExtendedGame = StarDeferenceGameInput;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

export function estimatedUsageRateFromRank(usageRank: number): number {
  return Math.max(0.18, 0.36 - (usageRank - 1) * 0.02);
}

export function resolvePlayerUsageRate(player: StarPlayerProfile): number {
  if (typeof player.usageRate === "number") return player.usageRate;
  return estimatedUsageRateFromRank(player.usageRank);
}

export function classifyStarPlayer(player: StarPlayerProfile): StarClassification {
  if (player.allStar || player.allNba) return "star";
  if ((player.starTierPercentile ?? 0) >= 90) return "star";
  if (player.usageRank <= 3) return "star";
  if (resolvePlayerUsageRate(player) >= STAR_USAGE_RATE_THRESHOLD) return "star";
  if (player.usageRank <= ROTATION_USAGE_RANK_MAX) return "rotation";
  return "rotation";
}

export function isBasketballStarLeague(leagueId: LeagueId): boolean {
  return leagueId === "nba" || leagueId === "wnba" || leagueId === "cbb";
}

function teamFouls(game: ExtendedGame, isHome: boolean): number {
  if (isHome && game.homeFouls !== undefined) return game.homeFouls;
  if (!isHome && game.awayFouls !== undefined) return game.awayFouls;
  return game.totalFouls / 2;
}

function playerFoulDrawnProxy(
  game: ExtendedGame,
  playerTeam: string,
  leagueId: LeagueId,
): number {
  const isHome = game.homeTeam.toUpperCase() === playerTeam.toUpperCase();
  if (leagueId === "nfl") {
    return isHome ? (game.awayFlags ?? 0) : (game.homeFlags ?? 0);
  }
  if (leagueId === "nhl") {
    return isHome ? (game.awayMinors ?? 0) : (game.homeMinors ?? 0);
  }
  return teamFouls(game, !isHome);
}

function playerBoxScore(
  game: ExtendedGame,
  playerId: string,
): PlayerFoulSnapshot | null {
  return game.personnel?.playerFouls?.find((row) => row.playerId === playerId) ?? null;
}

function drawnRatePerMinute(
  drawn: number,
  minutes: number | null,
): number {
  const denom = minutes && minutes > 0 ? minutes : DEFAULT_STAR_MINUTES;
  return drawn / denom;
}

export function formatStarDeferenceDisplay(index: number, leagueId: LeagueId): string {
  const unit =
    leagueId === "nfl"
      ? "flags/G"
      : leagueId === "nhl"
        ? "PIM/G"
        : "FT/G";
  const direction = index >= 0 ? "to Stars" : "from Stars";
  return `${formatSigned(index)} ${unit} ${direction}`;
}

function insufficientResult(
  observations = 0,
  games = 0,
  uniquePlayers = 0,
): StarDeferenceIndexResult {
  return {
    star_deference_index: null,
    star_deference_display: null,
    star_drawn_rate_delta: null,
    rotation_foul_rate_delta: null,
    star_player_observations: observations,
    star_sample_games: games,
    star_unique_players: uniquePlayers,
    method_note: STAR_DEFERENCE_METHOD_NOTE,
    data_quality: "insufficient",
  };
}

export function buildLeagueStarBaselines(
  games: StarDeferenceGameInput[],
  stars: StarPlayerProfile[],
  leagueId: LeagueId,
): Map<string, { drawnSum: number; games: number; personalFoulSum: number; personalFoulGames: number }> {
  const starByTeamSeason = new Map<string, StarPlayerProfile[]>();
  for (const player of stars) {
    if (classifyStarPlayer(player) !== "star") continue;
    const key = `${player.team}|${player.season}`;
    const bucket = starByTeamSeason.get(key) ?? [];
    bucket.push(player);
    starByTeamSeason.set(key, bucket);
  }

  const baselines = new Map<
    string,
    { drawnSum: number; games: number; personalFoulSum: number; personalFoulGames: number }
  >();

  for (const game of games) {
    for (const side of [
      { team: game.homeTeam, season: game.season },
      { team: game.awayTeam, season: game.season },
    ]) {
      const roster = starByTeamSeason.get(`${side.team.toUpperCase()}|${side.season}`) ?? [];
      for (const player of roster) {
        const drawn = playerFoulDrawnProxy(game, player.team, leagueId);
        const box = playerBoxScore(game, player.playerId);
        const current = baselines.get(player.playerId) ?? {
          drawnSum: 0,
          games: 0,
          personalFoulSum: 0,
          personalFoulGames: 0,
        };
        current.drawnSum += drawn;
        current.games += 1;
        if (box?.personalFouls !== undefined) {
          current.personalFoulSum += box.personalFouls;
          current.personalFoulGames += 1;
        }
        baselines.set(player.playerId, current);
      }
    }
  }

  return baselines;
}

export function computeStarDeferenceIndex(
  leagueId: LeagueId,
  officialSlug: string,
  games: StarDeferenceGameInput[],
  stars: StarPlayerProfile[],
  options?: { sampleWindow?: number },
): StarDeferenceIndexResult {
  if (!isBasketballStarLeague(leagueId) && leagueId !== "nfl" && leagueId !== "nhl") {
    return insufficientResult();
  }

  const sampleWindow = options?.sampleWindow ?? STAR_SAMPLE_WINDOW;
  const sampleGames = games.slice(-sampleWindow);
  const leagueBaselines = buildLeagueStarBaselines(sampleGames, stars, leagueId);

  const officiatedGames = sampleGames.filter((game) =>
    game.officials.some((official) => refSlug(official.name, official.number) === officialSlug),
  );

  const starPlayers = stars.filter((player) => classifyStarPlayer(player) === "star");
  const rotationPlayers = stars.filter((player) => classifyStarPlayer(player) === "rotation");

  let starObservations = 0;
  let starSampleGames = 0;
  const uniqueStars = new Set<string>();
  let weightedDeltaSum = 0;
  let weightSum = 0;

  let starDrawnRateSum = 0;
  let starDrawnRateCount = 0;
  let rotationDrawnRateSum = 0;
  let rotationDrawnRateCount = 0;
  let starPersonalFoulRateSum = 0;
  let starPersonalFoulRateCount = 0;
  let rotationPersonalFoulRateSum = 0;
  let rotationPersonalFoulRateCount = 0;

  for (const game of officiatedGames) {
    let gameHadStar = false;

    for (const side of [
      { team: game.homeTeam, season: game.season },
      { team: game.awayTeam, season: game.season },
    ]) {
      const teamStars = starPlayers.filter(
        (player) =>
          player.team === side.team.toUpperCase() && player.season === side.season,
      );
      const teamRotation = rotationPlayers.filter(
        (player) =>
          player.team === side.team.toUpperCase() && player.season === side.season,
      );

      for (const player of teamStars) {
        const baseline = leagueBaselines.get(player.playerId);
        if (!baseline || baseline.games < 3) continue;

        const leagueAvg = baseline.drawnSum / baseline.games;
        const drawnProxy = playerFoulDrawnProxy(game, player.team, leagueId);
        const delta = drawnProxy - leagueAvg;

        weightedDeltaSum += delta;
        weightSum += 1;
        starObservations += 1;
        uniqueStars.add(player.playerId);
        gameHadStar = true;

        const box = playerBoxScore(game, player.playerId);
        const drawnRate = drawnRatePerMinute(
          box?.foulsDrawn ?? drawnProxy,
          box ? DEFAULT_STAR_MINUTES : null,
        );
        starDrawnRateSum += drawnRate;
        starDrawnRateCount += 1;
        if (box?.personalFouls !== undefined) {
          starPersonalFoulRateSum += drawnRatePerMinute(box.personalFouls, DEFAULT_STAR_MINUTES);
          starPersonalFoulRateCount += 1;
        }
      }

      for (const player of teamRotation) {
        const drawnProxy = playerFoulDrawnProxy(game, player.team, leagueId);
        const box = playerBoxScore(game, player.playerId);
        const drawnRate = drawnRatePerMinute(
          box?.foulsDrawn ?? drawnProxy,
          box ? DEFAULT_STAR_MINUTES : null,
        );
        rotationDrawnRateSum += drawnRate;
        rotationDrawnRateCount += 1;
        if (box?.personalFouls !== undefined) {
          rotationPersonalFoulRateSum += drawnRatePerMinute(
            box.personalFouls,
            DEFAULT_STAR_MINUTES,
          );
          rotationPersonalFoulRateCount += 1;
        }
      }
    }

    if (gameHadStar) starSampleGames += 1;
  }

  if (
    starObservations < STAR_MIN_PLAYER_OBSERVATIONS ||
    uniqueStars.size < STAR_MIN_UNIQUE_PLAYERS ||
    weightSum === 0
  ) {
    return insufficientResult(starObservations, starSampleGames, uniqueStars.size);
  }

  const index = round2(weightedDeltaSum / weightSum);
  const starDrawnRateDelta =
    starDrawnRateCount > 0 && rotationDrawnRateCount > 0
      ? round3(starDrawnRateSum / starDrawnRateCount - rotationDrawnRateSum / rotationDrawnRateCount)
      : null;
  const rotationFoulRateDelta =
    starPersonalFoulRateCount > 0 && rotationPersonalFoulRateCount > 0
      ? round3(
          rotationPersonalFoulRateSum / rotationPersonalFoulRateCount -
            starPersonalFoulRateSum / starPersonalFoulRateCount,
        )
      : null;

  return {
    star_deference_index: index,
    star_deference_display: formatStarDeferenceDisplay(index, leagueId),
    star_drawn_rate_delta: starDrawnRateDelta,
    rotation_foul_rate_delta: rotationFoulRateDelta,
    star_player_observations: starObservations,
    star_sample_games: starSampleGames,
    star_unique_players: uniqueStars.size,
    method_note: STAR_DEFERENCE_METHOD_NOTE,
    data_quality: "ok",
  };
}

export function starTreatmentFieldsFromResult(
  result: StarDeferenceIndexResult,
): import("@/lib/types").StarTreatmentAnalytics {
  return {
    star_deference_index: result.star_deference_index,
    star_deference_display: result.star_deference_display,
    star_drawn_rate_delta: result.star_drawn_rate_delta,
    rotation_foul_rate_delta: result.rotation_foul_rate_delta,
    star_player_observations: result.star_player_observations,
    star_sample_games: result.star_sample_games,
    star_unique_players: result.star_unique_players,
    method_note: result.method_note,
  };
}
