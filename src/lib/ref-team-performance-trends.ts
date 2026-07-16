import { formatWlp } from "@/lib/ref-betting";
import { TEAM_REF_MIN_GAMES } from "@/lib/teamRefLeaderboards";
import { atsFieldsFromStat } from "@/lib/team-ats";
import type { RefProfile, RefTeamStat } from "@/lib/types";

export type RefTeamPerformanceRow = {
  abbr: string;
  games: number;
  recordLabel: string;
  rate: number;
  rateLabel: string;
  metric: "ats" | "win";
};

function teamPerformanceRow(
  abbr: string,
  stat: RefTeamStat,
): RefTeamPerformanceRow | null {
  if (stat.games < TEAM_REF_MIN_GAMES) return null;

  const ats = atsFieldsFromStat(stat);
  if (ats.atsGames >= TEAM_REF_MIN_GAMES) {
    return {
      abbr,
      games: stat.games,
      recordLabel: formatWlp(ats.atsWins, ats.atsLosses, ats.atsPushes),
      rate: ats.atsCoverRate,
      rateLabel: `${(ats.atsCoverRate * 100).toFixed(1)}% ATS`,
      metric: "ats",
    };
  }

  const wins = stat.wins ?? 0;
  const losses = stat.losses ?? 0;
  const decisions = wins + losses;
  if (decisions < TEAM_REF_MIN_GAMES) return null;

  return {
    abbr,
    games: stat.games,
    recordLabel: formatWlp(wins, losses),
    rate: stat.winRate,
    rateLabel: `${(stat.winRate * 100).toFixed(1)}% Win`,
    metric: "win",
  };
}

export function buildRefTeamPerformanceTrends(
  profile: Pick<RefProfile, "teamStats">,
  limit = 5,
): {
  best: RefTeamPerformanceRow[];
  worst: RefTeamPerformanceRow[];
} {
  const rows = Object.entries(profile.teamStats ?? {})
    .map(([abbr, stat]) => teamPerformanceRow(abbr, stat))
    .filter((row): row is RefTeamPerformanceRow => row !== null);

  const best = [...rows]
    .sort((a, b) => b.rate - a.rate || b.games - a.games)
    .slice(0, limit);

  const worst = [...rows]
    .sort((a, b) => a.rate - b.rate || b.games - a.games)
    .slice(0, limit);

  return { best, worst };
}
