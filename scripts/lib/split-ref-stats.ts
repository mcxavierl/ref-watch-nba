import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";

/** Split ref-stats for Worker CPU limits: core (~500KB) vs teamSplits (~4MB). */
export function splitRefStatsForDeploy(full: RefStatsFile): {
  core: RefStatsFile;
  teamSplits: Record<string, TeamCrewSplit[]>;
} {
  const teamSplits = full.teamSplits ?? {};
  const core: RefStatsFile = {
    ...full,
    teamSplits: {},
  };
  return { core, teamSplits };
}

export function mergeTeamSplits(
  core: RefStatsFile,
  teamSplits: Record<string, TeamCrewSplit[]>,
): RefStatsFile {
  return { ...core, teamSplits };
}
