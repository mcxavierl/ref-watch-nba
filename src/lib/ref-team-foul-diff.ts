import type { RefTeamStat, TeamCrewSplit } from "@/lib/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Games-weighted crew foul edge for one ref×team from team crew splits. */
export function avgFoulDifferentialFromTeamSplits(
  refSlug: string,
  teamAbbr: string,
  splits: TeamCrewSplit[],
): number | null {
  const key = refSlug.toLowerCase();
  let games = 0;
  let weightedSum = 0;

  for (const split of splits) {
    if (!split.crewKey.split("|").includes(key)) continue;
    games += split.games;
    weightedSum += split.foulDifferential * split.games;
  }

  if (games <= 0) return null;
  return round1(weightedSum / games);
}

/** Prefer stored ref×team whistle edge; fall back to crew splits when logs lack fouls. */
export function resolveRefTeamFoulDifferential(
  refSlug: string,
  teamAbbr: string,
  stat: Pick<RefTeamStat, "avgFoulDifferential">,
  splits: TeamCrewSplit[],
): number {
  if (stat.avgFoulDifferential !== 0) return stat.avgFoulDifferential;
  return avgFoulDifferentialFromTeamSplits(refSlug, teamAbbr, splits) ?? 0;
}
