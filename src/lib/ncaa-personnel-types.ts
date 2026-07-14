/** NCAA official sidecar metadata for analytics enrichment. */
export type NcaaSportCode = "CBB" | "CFB";

export type NcaaExperienceLevel =
  | "veteran"
  | "experienced"
  | "developing"
  | "rookie";

export type NcaaOfficialStatus = "active" | "inactive";

export interface ProLeagueOfficialLink {
  league: "nba" | "nfl" | "nhl" | "epl" | "laliga";
  slug: string;
  name: string;
  number: number;
  matchConfidence: "exact" | "alias";
}

export interface NcaaOfficialSidecar {
  officialId: string;
  slug: string;
  sport: NcaaSportCode;
  name: string;
  number: number;
  conference: string;
  primaryRegion: string;
  experienceLevel: NcaaExperienceLevel;
  historicalGameCount: number;
  status: NcaaOfficialStatus;
  proLeagueLinks: ProLeagueOfficialLink[];
}

export interface NcaaPersonnelProfileFile {
  lastUpdated: string;
  league: "NCAA";
  officials: NcaaOfficialSidecar[];
}
