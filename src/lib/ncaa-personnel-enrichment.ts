import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import type { NcaaConferenceTerritory } from "@/lib/ncaa-pipeline";
import type { NcaaExperienceLevel } from "@/lib/ncaa-personnel-types";
import type { RefTeamStat } from "@/lib/types";

export type NcaaPrimaryRegion =
  | "Southeast"
  | "Midwest"
  | "Central"
  | "Northeast"
  | "West"
  | "National";

const CONFERENCE_TO_REGION: Record<NcaaConferenceTerritory, NcaaPrimaryRegion> = {
  ACC: "Southeast",
  SEC: "Southeast",
  "Big Ten": "Midwest",
  "Big 12": "Central",
  "Big East": "Northeast",
  "Pac-12": "West",
  WCC: "West",
  Other: "National",
};

export function conferenceToPrimaryRegion(
  conference: string,
): NcaaPrimaryRegion {
  const normalized = conference.trim() as NcaaConferenceTerritory;
  return CONFERENCE_TO_REGION[normalized] ?? "National";
}

export function deriveExperienceLevel(
  historicalGameCount: number,
): NcaaExperienceLevel {
  if (historicalGameCount >= 200) return "veteran";
  if (historicalGameCount >= 100) return "experienced";
  if (historicalGameCount >= 30) return "developing";
  return "rookie";
}

/** Infer primary conference from ref×team sample (CBB only). */
export function inferConferenceFromTeamStats(
  teamStats: Record<string, RefTeamStat> | undefined,
): NcaaConferenceTerritory {
  if (!teamStats) return "Other";

  let bestTeam = "";
  let bestGames = 0;
  for (const [team, stat] of Object.entries(teamStats)) {
    if (stat.games > bestGames) {
      bestGames = stat.games;
      bestTeam = team;
    }
  }

  if (!bestTeam) return "Other";
  return getCbbTeam(bestTeam)?.conference ?? "Other";
}

export function officialIdForSport(
  sport: "CBB" | "CFB",
  slug: string,
): string {
  return `${sport.toLowerCase()}-${slug}`;
}
