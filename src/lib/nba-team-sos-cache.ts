import type { TeamStrengthOfSchedule } from "@/lib/nba-strength-of-schedule";
import sosJson from "../../data/nba-team-sos.json" with { type: "json" };

export interface NbaTeamSosFile {
  lastUpdated: string;
  source: string;
  sinceSeason: string;
  seasons: string[];
  teams: Record<string, TeamStrengthOfSchedule>;
}

const cache = sosJson as NbaTeamSosFile;

export function getNbaTeamSosCache(): NbaTeamSosFile {
  return cache;
}

export function getCachedTeamStrengthOfSchedule(
  teamAbbr: string,
): TeamStrengthOfSchedule | null {
  return cache.teams[teamAbbr.toUpperCase()] ?? null;
}
