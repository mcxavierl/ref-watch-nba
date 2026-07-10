import type { TeamCrewSplit } from "@/lib/types";
import type { SortDirection } from "@/lib/teamRefLeaderboards";

/** Minimum games before a crew appears in team crew tables by default. */
export const TEAM_CREW_MIN_GAMES = 8;

export type TeamCrewSortKey = "games" | "winRate" | "scoring";
export type TeamCrewSort = `${TeamCrewSortKey}-${SortDirection}`;

export const TEAM_CREW_SORT_OPTIONS: {
  value: TeamCrewSort;
  label: string;
}[] = [
  { value: "games-desc", label: "Most games" },
  { value: "winRate-desc", label: "Win rate (high → low)" },
  { value: "winRate-asc", label: "Win rate (low → high)" },
  { value: "scoring-desc", label: "Scoring pace (high → low)" },
  { value: "scoring-asc", label: "Scoring pace (low → high)" },
];

function crewWinRate(split: TeamCrewSplit): number {
  return split.games > 0 ? split.wins / split.games : 0;
}

export function sortTeamCrewSplits(
  splits: TeamCrewSplit[],
  sort: TeamCrewSort,
): TeamCrewSplit[] {
  const [key, direction] = sort.split("-") as [TeamCrewSortKey, SortDirection];
  const mult = direction === "asc" ? 1 : -1;

  return [...splits].sort((a, b) => {
    switch (key) {
      case "winRate":
        return mult * (crewWinRate(a) - crewWinRate(b));
      case "scoring":
        return mult * (a.avgTotalPoints - b.avgTotalPoints);
      case "games":
        return mult * (a.games - b.games);
      default:
        return 0;
    }
  });
}

export function filterTeamCrewSplits(
  splits: TeamCrewSplit[],
  minGames: number,
  showAll: boolean,
): { visible: TeamCrewSplit[]; hiddenCount: number } {
  if (showAll) {
    return { visible: splits, hiddenCount: 0 };
  }
  const visible = splits.filter((s) => s.games >= minGames);
  return { visible, hiddenCount: splits.length - visible.length };
}
