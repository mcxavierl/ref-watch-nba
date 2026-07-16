/**
 * Hard-fail validation gates for NHL verified ingest.
 * Checks officials count, ref resolution, DISTINCT game_id dedup, and sample volume.
 */
import type { GameLogEntry } from "../../lib/game-logs";
import { refSlug } from "../../lib/slug";

export interface NhlValidationResult {
  check: string;
  passed: boolean;
  detail: string;
}

export interface NhlValidationSummary {
  passed: boolean;
  results: NhlValidationResult[];
  gameCount: number;
  duplicateGameIds: number;
  missingOfficials: number;
  badOfficialCounts: number;
}

const EXPECTED_OFFICIALS_MIN = 3;
const EXPECTED_OFFICIALS_MAX = 5;

export function validateNhlGameLogs(
  games: GameLogEntry[],
  options?: { minGames?: number },
): NhlValidationSummary {
  const minGames = options?.minGames ?? 10000;
  const results: NhlValidationResult[] = [];
  const seenIds = new Map<string, number>();
  let duplicateGameIds = 0;
  let missingOfficials = 0;
  let badOfficialCounts = 0;

  for (const game of games) {
    if (game.league !== "NHL") continue;

    seenIds.set(game.gameId, (seenIds.get(game.gameId) ?? 0) + 1);

    const officials = game.officials ?? [];
    if (officials.length === 0) {
      missingOfficials++;
      continue;
    }

    if (
      officials.length < EXPECTED_OFFICIALS_MIN ||
      officials.length > EXPECTED_OFFICIALS_MAX
    ) {
      badOfficialCounts++;
    }

    for (const official of officials) {
      if (!official.name?.trim()) {
        badOfficialCounts++;
        break;
      }
      const slug = refSlug(official.name, official.number ?? 0);
      if (!slug) badOfficialCounts++;
    }
  }

  for (const [, count] of seenIds) {
    if (count > 1) duplicateGameIds++;
  }

  const gameCount = seenIds.size;

  results.push({
    check: "distinct-game-id",
    passed: duplicateGameIds === 0,
    detail:
      duplicateGameIds === 0
        ? `${gameCount} DISTINCT game_id rows`
        : `${duplicateGameIds} duplicate game_id values`,
  });

  results.push({
    check: "officials-present",
    passed: missingOfficials === 0,
    detail:
      missingOfficials === 0
        ? "All games have officials"
        : `${missingOfficials} games missing officials`,
  });

  const officialsPct =
    gameCount > 0 ? (gameCount - missingOfficials) / gameCount : 0;
  results.push({
    check: "officials-count",
    passed: badOfficialCounts === 0,
    detail:
      badOfficialCounts === 0
        ? "Official counts within expected range (3-5)"
        : `${badOfficialCounts} games with bad official counts or empty names`,
  });

  results.push({
    check: "min-games",
    passed: gameCount >= minGames,
    detail: `${gameCount} games (minimum ${minGames})`,
  });

  results.push({
    check: "officials-coverage",
    passed: officialsPct >= 0.99,
    detail: `${(officialsPct * 100).toFixed(1)}% of games have crews`,
  });

  const passed = results.every((r) => r.passed);

  return {
    passed,
    results,
    gameCount,
    duplicateGameIds,
    missingOfficials,
    badOfficialCounts,
  };
}

export function formatValidationReport(summary: NhlValidationSummary): string {
  const lines = summary.results.map(
    (r) => `  ${r.passed ? "PASS" : "FAIL"} ${r.check}: ${r.detail}`,
  );
  return [`NHL ingest validation (${summary.passed ? "PASSED" : "FAILED"}):`, ...lines].join(
    "\n",
  );
}
