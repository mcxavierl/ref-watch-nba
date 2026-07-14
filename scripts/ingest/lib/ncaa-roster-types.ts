import type {
  NcaaExperienceLevel,
  NcaaOfficialStatus,
  NcaaSportCode,
  ProLeagueOfficialLink,
} from "../../../src/lib/ncaa-personnel-types";

/** Parsed row from NCAA officials CSV. */
export interface NcaaRosterRow {
  officialId: string;
  name: string;
  number: number;
  conference: string;
  primaryRegion: string;
  historicalGameCount: number;
  status: NcaaOfficialStatus;
}

export interface NcaaRosterParseResult {
  sport: NcaaSportCode;
  rows: NcaaRosterRow[];
  errors: string[];
}

export interface NcaaIntegrityFailure {
  row: number;
  officialId: string;
  reasons: string[];
}

/** Normalized NCAA official ready for RefProfile + sidecar write. */
export interface NcaaRefereeProfile {
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
  isNewEntity: boolean;
}
