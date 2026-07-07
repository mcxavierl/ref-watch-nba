import type { RefProfile, RefTeamStat } from "@/lib/types";

/** Minimum games a ref must have with a team before appearing on team leaderboards. */
export const TEAM_REF_MIN_GAMES = 5;

export interface TeamRefLeaderboardEntry {
  slug: string;
  name: string;
  games: number;
  avgFoulDifferential: number;
  avgTotalPoints: number;
  overRate: number;
  winRate: number;
}

function toEntry(
  ref: Pick<RefProfile, "slug" | "name">,
  stat: RefTeamStat,
): TeamRefLeaderboardEntry {
  return {
    slug: ref.slug,
    name: ref.name,
    games: stat.games,
    avgFoulDifferential: stat.avgFoulDifferential,
    avgTotalPoints: stat.avgTotalPoints,
    overRate: stat.overRate,
    winRate: stat.winRate,
  };
}

function qualifiedTeamStat(
  ref: RefProfile,
  teamAbbr: string,
): RefTeamStat | null {
  const stat = ref.teamStats?.[teamAbbr.toUpperCase()];
  if (!stat || stat.games < TEAM_REF_MIN_GAMES) return null;
  return stat;
}

export function getTeamFoulEdgeLeaderboard(
  refs: RefProfile[],
  teamAbbr: string,
  limit = 10,
): TeamRefLeaderboardEntry[] {
  return refs
    .map((ref) => {
      const stat = qualifiedTeamStat(ref, teamAbbr);
      if (!stat) return null;
      return toEntry(ref, stat);
    })
    .filter((entry): entry is TeamRefLeaderboardEntry => entry !== null)
    .sort((a, b) => b.avgFoulDifferential - a.avgFoulDifferential)
    .slice(0, limit);
}

export function getTeamScoringPaceLeaderboard(
  refs: RefProfile[],
  teamAbbr: string,
  limit = 10,
): TeamRefLeaderboardEntry[] {
  return refs
    .map((ref) => {
      const stat = qualifiedTeamStat(ref, teamAbbr);
      if (!stat) return null;
      return toEntry(ref, stat);
    })
    .filter((entry): entry is TeamRefLeaderboardEntry => entry !== null)
    .sort((a, b) => b.avgTotalPoints - a.avgTotalPoints)
    .slice(0, limit);
}
