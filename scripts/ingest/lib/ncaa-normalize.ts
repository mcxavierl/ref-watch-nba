import type {
  NcaaExperienceLevel,
  NcaaOfficialSidecar,
  NcaaPersonnelProfileFile,
  NcaaSportCode,
  ProLeagueOfficialLink,
} from "../../../src/lib/ncaa-personnel-types";
import {
  conferenceToPrimaryRegion,
  deriveExperienceLevel,
  officialIdForSport,
} from "../../../src/lib/ncaa-personnel-enrichment";
import type { RefProfile, RefStatsFile } from "../../../src/lib/types";
import { refSlug } from "../../lib/slug";
import {
  buildProLeagueOfficialIndex,
  resolveProLeagueLinks,
} from "./ncaa-entity-resolution";
import type { NcaaRefereeProfile, NcaaRosterRow } from "./ncaa-roster-types";

export function normalizeNcaaRosterRow(
  row: NcaaRosterRow,
  sport: NcaaSportCode,
  proIndex: ReturnType<typeof buildProLeagueOfficialIndex>,
): NcaaRefereeProfile {
  const slug = refSlug(row.name, row.number);
  const officialId = row.officialId || officialIdForSport(sport, slug);
  const conference = row.conference || "Other";
  const primaryRegion =
    row.primaryRegion || conferenceToPrimaryRegion(conference);
  const experienceLevel = deriveExperienceLevel(row.historicalGameCount);
  const proLeagueLinks = resolveProLeagueLinks(row.name, proIndex);

  return {
    officialId,
    slug,
    sport,
    name: row.name,
    number: row.number,
    conference,
    primaryRegion,
    experienceLevel,
    historicalGameCount: row.historicalGameCount,
    status: row.status,
    proLeagueLinks,
    isNewEntity: true,
  };
}

export function rosterProfileToSidecar(
  profile: NcaaRefereeProfile,
): NcaaOfficialSidecar {
  return {
    officialId: profile.officialId,
    slug: profile.slug,
    sport: profile.sport,
    name: profile.name,
    number: profile.number,
    conference: profile.conference,
    primaryRegion: profile.primaryRegion,
    experienceLevel: profile.experienceLevel,
    historicalGameCount: profile.historicalGameCount,
    status: profile.status,
    proLeagueLinks: profile.proLeagueLinks,
  };
}

export function buildStubRefProfile(
  profile: NcaaRefereeProfile,
  stats: RefStatsFile,
): RefProfile {
  return {
    slug: profile.slug,
    name: profile.name,
    number: profile.number,
    games: profile.historicalGameCount,
    avgTotalPoints: stats.meta.leagueAvgTotal,
    overRate: 0.5,
    avgFouls: stats.meta.leagueAvgFouls,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: [],
    recentGames: [],
  };
}

export function mergeNcaaProfilesIntoRefStats(
  stats: RefStatsFile,
  profiles: NcaaRefereeProfile[],
): { stats: RefStatsFile; added: number; skipped: number } {
  const existing = new Set(stats.refs.map((ref) => ref.slug));
  let added = 0;
  let skipped = 0;

  for (const profile of profiles) {
    if (existing.has(profile.slug)) {
      profile.isNewEntity = false;
      skipped += 1;
      continue;
    }
    stats.refs.push(buildStubRefProfile(profile, stats));
    existing.add(profile.slug);
    profile.isNewEntity = true;
    added += 1;
  }

  stats.meta.refCount = stats.refs.length;
  stats.meta.lastUpdated = new Date().toISOString();
  return { stats, added, skipped };
}

export function buildNcaaPersonnelProfileFile(
  profiles: NcaaRefereeProfile[],
): NcaaPersonnelProfileFile {
  return {
    lastUpdated: new Date().toISOString(),
    league: "NCAA",
    officials: profiles
      .map(rosterProfileToSidecar)
      .sort((a, b) => {
        const sportOrder = a.sport.localeCompare(b.sport);
        if (sportOrder !== 0) return sportOrder;
        return a.name.localeCompare(b.name);
      }),
  };
}

export function countProLeagueMatches(
  profiles: { proLeagueLinks: ProLeagueOfficialLink[] }[],
): number {
  return profiles.filter((profile) => profile.proLeagueLinks.length > 0).length;
}

export type ExperienceBreakdown = Record<NcaaExperienceLevel, number>;

export function experienceBreakdown(
  profiles: NcaaRefereeProfile[],
): ExperienceBreakdown {
  const counts: ExperienceBreakdown = {
    veteran: 0,
    experienced: 0,
    developing: 0,
    rookie: 0,
  };
  for (const profile of profiles) {
    counts[profile.experienceLevel] += 1;
  }
  return counts;
}
