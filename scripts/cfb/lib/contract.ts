import { getTeam } from "../../../src/lib/cfb/teams";
import type { CfbExtractedGame } from "./types";

export type CfbContractIssue = {
  gameId: string;
  field: string;
  message: string;
};

export type CfbContractValidationResult = {
  passed: number;
  failed: number;
  issues: CfbContractIssue[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function issue(gameId: string, field: string, message: string): CfbContractIssue {
  return { gameId, field, message };
}

export function validateExtractedGame(game: CfbExtractedGame): CfbContractIssue[] {
  const issues: CfbContractIssue[] = [];
  const gameId = game.gameId?.trim() || "(missing-id)";

  if (!game.gameId?.trim()) {
    issues.push(issue(gameId, "gameId", "gameId is required"));
  }
  if (!game.date?.trim() || !DATE_RE.test(game.date)) {
    issues.push(issue(gameId, "date", "date must be YYYY-MM-DD"));
  }
  if (!game.season?.trim()) {
    issues.push(issue(gameId, "season", "season is required"));
  }
  if (!game.homeTeam?.trim()) {
    issues.push(issue(gameId, "homeTeam", "homeTeam is required"));
  }
  if (!game.awayTeam?.trim()) {
    issues.push(issue(gameId, "awayTeam", "awayTeam is required"));
  }
  if (game.homeTeam && game.awayTeam && game.homeTeam === game.awayTeam) {
    issues.push(issue(gameId, "matchup", "homeTeam and awayTeam must differ"));
  }

  for (const abbr of [game.homeTeam, game.awayTeam]) {
    if (abbr && !getTeam(abbr)) {
      issues.push(issue(gameId, "team", `Unknown team abbreviation: ${abbr}`));
    }
  }

  if (game.totalPoints != null && (!Number.isFinite(game.totalPoints) || game.totalPoints < 0)) {
    issues.push(issue(gameId, "totalPoints", "totalPoints must be a non-negative number"));
  }
  if (game.totalFouls != null && (!Number.isFinite(game.totalFouls) || game.totalFouls < 0)) {
    issues.push(issue(gameId, "totalFouls", "totalFouls must be a non-negative number"));
  }

  if (game.officials != null) {
    if (!Array.isArray(game.officials)) {
      issues.push(issue(gameId, "officials", "officials must be an array when present"));
    } else {
      for (const [index, official] of game.officials.entries()) {
        if (!official?.name?.trim()) {
          issues.push(
            issue(gameId, `officials[${index}].name`, "official name is required"),
          );
        }
      }
    }
  }

  return issues;
}

export function validateExtractedGames(
  games: CfbExtractedGame[],
): CfbContractValidationResult {
  const issues: CfbContractIssue[] = [];
  let passed = 0;

  for (const game of games) {
    const gameIssues = validateExtractedGame(game);
    if (gameIssues.length === 0) {
      passed += 1;
    } else {
      issues.push(...gameIssues);
    }
  }

  return {
    passed,
    failed: games.length - passed,
    issues,
  };
}

export function countMissingOfficials(games: CfbExtractedGame[]): number {
  return games.filter(
    (game) => !game.officials || game.officials.length === 0,
  ).length;
}
