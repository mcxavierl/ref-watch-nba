import type { DataLeague } from "@/lib/game-logs-preload";

export interface TeamRefCloseGameSummary {
  date: string;
  opponent: string;
  teamScore: number;
  opponentScore: number;
  margin: number;
}

export interface TeamRefCloseGamesStat {
  closeCount: number;
  totalGames: number;
  closeGames: TeamRefCloseGameSummary[];
}

/** League-aware final-margin threshold for ref×team close-game counts. */
export function closeGameMarginThreshold(league: DataLeague): number {
  switch (league) {
    case "NHL":
    case "EPL":
    case "LALIGA":
      return 2;
    case "NBA":
    case "CBB":
      return 5;
    case "NFL":
    case "CFB":
      return 7;
    default:
      return 5;
  }
}

export function formatTeamRefCloseGamesTooltip(
  stat: TeamRefCloseGamesStat | undefined,
  teamLabel: string,
  league: DataLeague,
): string | undefined {
  if (!stat || stat.closeGames.length === 0) return undefined;
  const unit =
    league === "NHL" || league === "EPL" || league === "LALIGA" ? "goal" : "pt";
  const plural = stat.closeGames.length === 1 ? unit : `${unit}s`;
  const lines = stat.closeGames.slice(0, 8).map((game) => {
    return `${game.date} vs ${game.opponent} (${game.teamScore}-${game.opponentScore}, ${game.margin} ${plural} margin)`;
  });
  const suffix =
    stat.closeGames.length > 8
      ? `\n+${stat.closeGames.length - 8} more close games`
      : "";
  return `Close games for ${teamLabel} under this ref:\n${lines.join("\n")}${suffix}`;
}
