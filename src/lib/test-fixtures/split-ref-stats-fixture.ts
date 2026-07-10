import { readFileSync } from "node:fs";
import { splitRefStatsForDeploy } from "../../../scripts/lib/split-ref-stats";
import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";

export function loadSplitRefStatsFixture(
  league: "nba" | "nhl" | "nfl" | "epl",
): { core: RefStatsFile; teamSplits: Record<string, TeamCrewSplit[]> } {
  const path =
    league === "nba"
      ? "data/ref-stats.json"
      : `data/${league}/ref-stats.json`;
  const full = JSON.parse(readFileSync(path, "utf8")) as RefStatsFile;
  return splitRefStatsForDeploy(full);
}
