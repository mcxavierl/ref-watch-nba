import type { RefProfile, RefTeamStat } from "@/lib/types";

/** Minimum games a ref must have with a team before appearing on team leaderboards. */
export const TEAM_REF_MIN_GAMES = 8;

export interface TeamRefLeaderboardEntry {
  slug: string;
  name: string;
  games: number;
  avgFoulDifferential: number;
  avgTotalPoints: number;
  overRate: number;
  winRate: number;
}

export type TeamRefSortKey = "winRate" | "foulEdge" | "games" | "scoring";
export type SortDirection = "asc" | "desc";

export type TeamRefSort = `${TeamRefSortKey}-${SortDirection}`;

export const TEAM_REF_SORT_OPTIONS: {
  value: TeamRefSort;
  label: string;
}[] = [
  { value: "foulEdge-desc", label: "Foul edge (best first)" },
  { value: "foulEdge-asc", label: "Foul edge (worst first)" },
  { value: "winRate-desc", label: "Win rate (high → low)" },
  { value: "winRate-asc", label: "Win rate (low → high)" },
  { value: "scoring-desc", label: "Scoring pace (high → low)" },
  { value: "games-desc", label: "Most games" },
];

export function sortTeamRefEntries(
  entries: TeamRefLeaderboardEntry[],
  sort: TeamRefSort,
): TeamRefLeaderboardEntry[] {
  const [key, direction] = sort.split("-") as [TeamRefSortKey, SortDirection];
  const mult = direction === "asc" ? 1 : -1;

  return [...entries].sort((a, b) => {
    switch (key) {
      case "winRate":
        return mult * (a.winRate - b.winRate);
      case "foulEdge":
        return mult * (a.avgFoulDifferential - b.avgFoulDifferential);
      case "scoring":
        return mult * (a.avgTotalPoints - b.avgTotalPoints);
      case "games":
        return mult * (a.games - b.games);
      default:
        return 0;
    }
  });
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

/** All refs with enough games vs this team, sorted by sample size. */
export function getTeamRefSplits(
  refs: RefProfile[],
  teamAbbr: string,
): TeamRefLeaderboardEntry[] {
  return refs
    .map((ref) => {
      const stat = qualifiedTeamStat(ref, teamAbbr);
      if (!stat) return null;
      return toEntry(ref, stat);
    })
    .filter((entry): entry is TeamRefLeaderboardEntry => entry !== null)
    .sort((a, b) => b.games - a.games);
}
