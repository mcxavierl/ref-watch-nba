import { loadRuntimeGameLogs, type DataLeague } from "@/lib/game-logs";
import type { LeagueId } from "@/lib/leagues";
import { EMPTY_DISPLAY } from "@/lib/finding-copy";
import { homeAtsResult, hasClosingSpreadLine } from "@/lib/team-ats";

const LEAGUE_TO_DATA: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

export type LeagueHomeCoverDelta = {
  value: string;
  coverRate: number;
  games: number;
};

function formatCoverDelta(deltaPct: number): string {
  const sign = deltaPct > 0 ? "+" : deltaPct < 0 ? "-" : "";
  return `${sign}${Math.abs(deltaPct).toFixed(1)}%`;
}

/** League-wide home ATS cover rate minus a neutral 50% split. */
export function computeLeagueHomeCoverDelta(
  leagueId: LeagueId,
): LeagueHomeCoverDelta | null {
  const dataLeague = LEAGUE_TO_DATA[leagueId];
  if (!dataLeague) return null;

  const logs = loadRuntimeGameLogs(dataLeague);
  if (!logs?.games?.length) return null;

  let wins = 0;
  let losses = 0;
  let pushes = 0;

  for (const game of logs.games) {
    if (!hasClosingSpreadLine(game) || !Number.isFinite(game.homeSpread)) continue;
    const result = homeAtsResult(game.homeScore, game.awayScore, game.homeSpread);
    if (result === "win") wins += 1;
    else if (result === "loss") losses += 1;
    else pushes += 1;
  }

  const games = wins + losses + pushes;
  if (games < 30) return null;

  const coverRate = wins / games;
  const deltaPct = (coverRate - 0.5) * 100;

  return {
    value: formatCoverDelta(deltaPct),
    coverRate,
    games,
  };
}

export function leagueHomeBiasPreviewValue(leagueId: LeagueId): string {
  return computeLeagueHomeCoverDelta(leagueId)?.value ?? EMPTY_DISPLAY;
}
