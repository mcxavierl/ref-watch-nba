import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { RefTeamStat, TeamCrewSplit } from "@/lib/types";

export type AtsResult = "win" | "loss" | "push";

export interface TeamAtsSampleRecord {
  atsWins: number;
  atsLosses: number;
  atsPushes: number;
  atsGames: number;
  atsCoverRate: number;
}

export function hasClosingSpreadLine(game: RuntimeGameLogEntry): boolean {
  return game.lineSource === "external";
}

/** Home team against the spread (US convention: negative spread = home favorite). */
export function homeAtsResult(
  homeScore: number,
  awayScore: number,
  homeSpread: number,
): AtsResult {
  const margin = homeScore - awayScore;
  const adjusted = margin + homeSpread;
  if (Math.abs(adjusted) < 0.001) return "push";
  return adjusted > 0 ? "win" : "loss";
}

/** Team-perspective ATS result; null when the game has no closing line. */
export function teamAtsResult(
  isHome: boolean,
  homeScore: number,
  awayScore: number,
  homeSpread: number,
  hasLine: boolean,
): AtsResult | null {
  if (!hasLine) return null;
  const home = homeAtsResult(homeScore, awayScore, homeSpread);
  if (isHome) return home;
  if (home === "push") return "push";
  return home === "win" ? "loss" : "win";
}

export function atsCoverRateFromRecord(
  wins: number,
  losses: number,
  pushes: number,
): number {
  const decisions = wins + losses + pushes;
  if (decisions <= 0) return 0;
  return Math.round((wins / decisions) * 1000) / 1000;
}

/** True when the team was market underdog (US spread convention). */
export function isTeamMarketUnderdog(
  isHome: boolean,
  homeSpread: number,
): boolean {
  if (isHome) return homeSpread > 0;
  return homeSpread < 0;
}

/** Phi coefficient for binary underdog flag vs binary ATS cover (pushes excluded). */
export function phiUnderdogCoverCorrelation(
  samples: { underdog: boolean; covered: boolean }[],
): number | null {
  if (samples.length < 8) return null;
  let n11 = 0;
  let n10 = 0;
  let n01 = 0;
  let n00 = 0;
  for (const row of samples) {
    if (row.underdog && row.covered) n11 += 1;
    else if (row.underdog && !row.covered) n10 += 1;
    else if (!row.underdog && row.covered) n01 += 1;
    else n00 += 1;
  }
  const n1 = n11 + n10;
  const n0 = n01 + n00;
  const m1 = n11 + n01;
  const m0 = n10 + n00;
  const denom = Math.sqrt(n1 * n0 * m1 * m0);
  if (denom <= 0) return null;
  return Math.round(((n11 * n00 - n10 * n01) / denom) * 1000) / 1000;
}

export function formatAtsRecord(
  wins: number,
  losses: number,
  pushes: number,
): string {
  if (pushes > 0) return `${wins}-${losses}-${pushes}`;
  return `${wins}-${losses}`;
}

/** Sum ATS W-L-P across crew splits with lined games. */
export function getTeamAtsSampleRecord(
  splits: TeamCrewSplit[],
): TeamAtsSampleRecord {
  const atsWins = splits.reduce((sum, split) => sum + (split.atsWins ?? 0), 0);
  const atsLosses = splits.reduce(
    (sum, split) => sum + (split.atsLosses ?? 0),
    0,
  );
  const atsPushes = splits.reduce(
    (sum, split) => sum + (split.atsPushes ?? 0),
    0,
  );
  const atsGames = atsWins + atsLosses + atsPushes;
  return {
    atsWins,
    atsLosses,
    atsPushes,
    atsGames,
    atsCoverRate: atsCoverRateFromRecord(atsWins, atsLosses, atsPushes),
  };
}

export function atsFieldsFromStat(stat: RefTeamStat): {
  atsWins: number;
  atsLosses: number;
  atsPushes: number;
  atsGames: number;
  atsCoverRate: number;
} {
  const atsWins = stat.atsWins ?? 0;
  const atsLosses = stat.atsLosses ?? 0;
  const atsPushes = stat.atsPushes ?? 0;
  const atsGames = stat.atsGames ?? atsWins + atsLosses + atsPushes;
  return {
    atsWins,
    atsLosses,
    atsPushes,
    atsGames,
    atsCoverRate:
      stat.atsCoverRate ?? atsCoverRateFromRecord(atsWins, atsLosses, atsPushes),
  };
}
