import type { RefTeamStat, TeamCrewSplit } from "@/lib/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Match slug-based crew keys (NBA) and name-based keys (EPL football-data). */
export function refMatchesCrewKey(refSlug: string, crewKey: string): boolean {
  const normalizedSlug = refSlug.toLowerCase().trim();
  const looseKey = normalizedSlug.replace(/-\d+$/, "").replace(/-/g, " ");
  return crewKey
    .toLowerCase()
    .split("|")
    .some((segment) => {
      const key = segment.trim();
      return key === normalizedSlug || key === looseKey;
    });
}

/** Games-weighted crew foul edge for one ref×team from team crew splits. */
export function avgFoulDifferentialFromTeamSplits(
  refSlug: string,
  teamAbbr: string,
  splits: TeamCrewSplit[],
): number | null {
  let games = 0;
  let weightedSum = 0;

  for (const split of splits) {
    if (!refMatchesCrewKey(refSlug, split.crewKey)) continue;
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
