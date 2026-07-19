import { MIN_NFL_GAMES } from "../../lib/constants/ingest-thresholds";
import type { NflHistoricalGameLogEntry } from "./nflverse-historical";

export type NflValidationResult = {
  check: string;
  passed: boolean;
  detail: string;
};

const NFL_TEAM_ABBRS = new Set([
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
  "TEN", "WAS",
]);

export type NflIngestValidationOptions = {
  minGames?: number;
  minOfficialCoveragePct?: number;
  maxDuplicateGameIds?: number;
};

export function validateNflGameLogs(
  games: NflHistoricalGameLogEntry[],
  options: NflIngestValidationOptions = {},
): NflValidationResult[] {
  const minGames = options.minGames ?? MIN_NFL_GAMES;
  const minOfficialCoveragePct = options.minOfficialCoveragePct ?? 95;
  const maxDuplicateGameIds = options.maxDuplicateGameIds ?? 0;

  const results: NflValidationResult[] = [];

  results.push({
    check: "game-count",
    passed: games.length >= minGames,
    detail: `${games.length} games (minimum ${minGames})`,
  });

  const seenIds = new Map<string, number>();
  let missingOfficials = 0;
  let emptyOfficialNames = 0;
  let invalidTeams = 0;
  let invalidScores = 0;

  for (const game of games) {
    seenIds.set(game.gameId, (seenIds.get(game.gameId) ?? 0) + 1);

    if (!NFL_TEAM_ABBRS.has(game.homeTeam) || !NFL_TEAM_ABBRS.has(game.awayTeam)) {
      invalidTeams++;
    }

    if (
      game.homeScore < 0 ||
      game.awayScore < 0 ||
      (game.homeScore === 0 && game.awayScore === 0)
    ) {
      invalidScores++;
    }

    if (!game.officials?.length) {
      missingOfficials++;
      continue;
    }

    for (const official of game.officials) {
      if (!official.name?.trim()) emptyOfficialNames++;
    }
  }

  const duplicateIds = [...seenIds.values()].filter((n) => n > 1).length;
  results.push({
    check: "distinct-game-id",
    passed: duplicateIds <= maxDuplicateGameIds,
    detail: `${duplicateIds} duplicate game_id values`,
  });

  const officialCoveragePct =
    games.length > 0
      ? ((games.length - missingOfficials) / games.length) * 100
      : 0;
  results.push({
    check: "officials-coverage",
    passed: officialCoveragePct >= minOfficialCoveragePct,
    detail: `${officialCoveragePct.toFixed(1)}% games with officials (${missingOfficials} missing)`,
  });

  results.push({
    check: "officials-names",
    passed: emptyOfficialNames === 0,
    detail: `${emptyOfficialNames} empty official names`,
  });

  results.push({
    check: "team-abbreviations",
    passed: invalidTeams === 0,
    detail: `${invalidTeams} games with invalid team abbreviations`,
  });

  results.push({
    check: "scores",
    passed: invalidScores === 0,
    detail: `${invalidScores} games with invalid scores`,
  });

  return results;
}

export function assertNflIngestValid(
  games: NflHistoricalGameLogEntry[],
  options?: NflIngestValidationOptions,
): void {
  const results = validateNflGameLogs(games, options);
  const failures = results.filter((r) => !r.passed);
  for (const result of results) {
    const label = result.passed ? "PASS" : "FAIL";
    console.log(`  [${label}] ${result.check}: ${result.detail}`);
  }
  if (failures.length > 0) {
    throw new Error(
      `NFL ingest validation failed (${failures.length} check(s)): ` +
        failures.map((f) => f.check).join(", "),
    );
  }
}
