import { z } from "zod";
import { classifyNflPenaltySlug } from "../../../src/config/penalty-types";
import type { LeagueId } from "../../../src/lib/leagues";
import { crewIdFromOfficials } from "../../../src/lib/schema/foul-events";
import { refSlug } from "../../lib/slug";
import type { GameLogEntry } from "../../lib/game-logs";

export const matrixWhistleRecordSchema = z.object({
  category: z.string().min(1, "category is required"),
  officialId: z.string().min(1, "officialId is required"),
  crewId: z.string().min(1, "crewId is required"),
  gameTimestamp: z.string().min(1, "gameTimestamp is required"),
  gameId: z.string().optional(),
  league: z.string().optional(),
});

export type MatrixWhistleRecord = z.infer<typeof matrixWhistleRecordSchema>;

function toGameTimestamp(date: string): string | null {
  const trimmed = date.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

/** Expand a game log into matrix whistle records (one per official assignment). */
export function expandGameToMatrixRecords(
  game: GameLogEntry,
  leagueId: LeagueId,
): unknown[] {
  const gameTimestamp = toGameTimestamp(game.date);
  const records: unknown[] = [];
  const crewId = crewIdFromOfficials(game.officials);

  for (const official of game.officials) {
    records.push({
      category: "game-officiating",
      officialId: refSlug(official.name, official.number),
      crewId,
      gameTimestamp,
      gameId: game.gameId,
      league: leagueId,
    });
  }

  if (leagueId === "nfl" && game.penaltyEvents?.length) {
    for (const event of game.penaltyEvents) {
      for (const official of game.officials) {
        records.push({
          category: classifyNflPenaltySlug(event.type),
          officialId: refSlug(official.name, official.number),
          crewId,
          gameTimestamp,
          gameId: game.gameId,
          league: leagueId,
        });
      }
    }
  }

  return records;
}

export type MatrixRecordValidationResult = {
  valid: MatrixWhistleRecord[];
  invalid: Array<{ index: number; issues: string[] }>;
};

export function validateMatrixRecords(records: unknown[]): MatrixRecordValidationResult {
  const valid: MatrixWhistleRecord[] = [];
  const invalid: Array<{ index: number; issues: string[] }> = [];

  records.forEach((record, index) => {
    const parsed = matrixWhistleRecordSchema.safeParse(record);
    if (parsed.success) {
      valid.push(parsed.data);
      return;
    }

    invalid.push({
      index,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    });
  });

  return { valid, invalid };
}

function logCriticalMatrixError(gameId: string, issues: string[]): void {
  console.error(
    `[CRITICAL] matrix ingest: excluding game ${gameId} - invalid record(s): ${issues.join("; ")}`,
  );
}

/** Validate matrix records and drop games that would poison aggregate stats. */
export function filterGamesForMatrixGeneration(
  games: GameLogEntry[],
  leagueId: LeagueId,
): {
  games: GameLogEntry[];
  excludedGames: number;
  excludedRecords: number;
  skippedIncomplete: number;
} {
  const clean: GameLogEntry[] = [];
  let excludedGames = 0;
  let excludedRecords = 0;
  let skippedIncomplete = 0;

  for (const game of games) {
    if (game.officials.length === 0) {
      skippedIncomplete += 1;
      continue;
    }

    const rawRecords = expandGameToMatrixRecords(game, leagueId);
    const validation = validateMatrixRecords(rawRecords);
    if (validation.invalid.length > 0) {
      excludedGames += 1;
      excludedRecords += validation.invalid.length;
      logCriticalMatrixError(
        game.gameId,
        validation.invalid.flatMap((entry) => entry.issues),
      );
      continue;
    }

    if (validation.valid.length === 0) {
      excludedGames += 1;
      logCriticalMatrixError(game.gameId, ["no valid matrix records after validation"]);
      continue;
    }

    clean.push(game);
  }

  return { games: clean, excludedGames, excludedRecords, skippedIncomplete };
}
