import type { RefGeographyEntry, RefStatsFile } from "@/lib/types";
import type { FindingLeague } from "@/lib/findings-shared";
import type { LeagueId } from "@/lib/leagues";
import nbaGeographyData from "../../data/nba/ref-geography.json";
import nflGeographyData from "../../data/nfl/ref-geography.json";
import nhlGeographyData from "../../data/nhl/ref-geography.json";
import eplGeographyData from "../../data/epl/ref-geography.json";
import laligaGeographyData from "../../data/laliga/ref-geography.json";
import cbbGeographyData from "../../data/cbb/ref-geography.json";
import cfbGeographyData from "../../data/cfb/ref-geography.json";

export interface RefGeographyFile {
  meta: {
    lastUpdated: string;
    league: string;
    source?: string;
  };
  officials: Record<string, RefGeographyEntry>;
}

const GEOGRAPHY_BY_LEAGUE: Record<FindingLeague, RefGeographyFile> = {
  NBA: nbaGeographyData as RefGeographyFile,
  NFL: nflGeographyData as RefGeographyFile,
  NHL: nhlGeographyData as RefGeographyFile,
  EPL: eplGeographyData as RefGeographyFile,
  LALIGA: laligaGeographyData as RefGeographyFile,
  CBB: cbbGeographyData as RefGeographyFile,
  CFB: cfbGeographyData as RefGeographyFile,
};

const LEAGUE_ID_TO_FINDING: Partial<Record<LeagueId, FindingLeague>> = {
  nba: "NBA",
  nfl: "NFL",
  nhl: "NHL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

export function getRefGeographyShard(league: FindingLeague): RefGeographyFile {
  return GEOGRAPHY_BY_LEAGUE[league];
}

function normalizeGeographyEntry(
  entry: RefGeographyEntry | undefined,
): RefGeographyEntry | undefined {
  if (!entry || typeof entry !== "object") return undefined;
  const birthplace =
    typeof entry.birthplace === "string" ? entry.birthplace.trim() : "";
  const hometown = typeof entry.hometown === "string" ? entry.hometown.trim() : "";
  const birthCountry =
    typeof entry.birthCountry === "string" ? entry.birthCountry.trim() : "";
  const region = typeof entry.region === "string" ? entry.region.trim() : "";
  if (!birthplace && !hometown && !birthCountry && !region) return undefined;
  return {
    ...(birthplace ? { birthplace } : {}),
    ...(hometown ? { hometown } : {}),
    ...(birthCountry ? { birthCountry } : {}),
    ...(region ? { region } : {}),
  };
}

/**
 * Immutable merge of geography shard + optional inline index onto ref profiles.
 * Safe for request-scoped caches — returns a new object, never mutates input.
 */
export function mergeRefGeographyIntoStats(
  stats: RefStatsFile,
  league: FindingLeague,
): RefStatsFile {
  const shard = getRefGeographyShard(league);
  const mergedIndex: Record<string, RefGeographyEntry> = {
    ...(stats.refGeography ?? {}),
  };

  for (const [slug, entry] of Object.entries(shard.officials ?? {})) {
    const normalized = normalizeGeographyEntry(entry);
    if (!normalized) continue;
    mergedIndex[slug] = { ...mergedIndex[slug], ...normalized };
  }

  const refs = stats.refs.map((ref) => {
    const indexEntry = mergedIndex[ref.slug];
    const birthplace = ref.birthplace?.trim() || indexEntry?.birthplace?.trim();
    const hometown = ref.hometown?.trim() || indexEntry?.hometown?.trim();
    const birthCountry = ref.birthCountry?.trim() || indexEntry?.birthCountry?.trim();
    const region = ref.region?.trim() || indexEntry?.region?.trim();
    if (!birthplace && !hometown && !birthCountry && !region) return ref;
    return {
      ...ref,
      ...(birthplace ? { birthplace } : {}),
      ...(hometown ? { hometown } : {}),
      ...(birthCountry ? { birthCountry } : {}),
      ...(region ? { region } : {}),
    };
  });

  const hasIndex = Object.keys(mergedIndex).length > 0;
  return {
    ...stats,
    refs,
    ...(hasIndex ? { refGeography: mergedIndex } : {}),
  };
}

/** Apply geography enrichment for a league id when a shard exists. */
export function enrichRefStatsWithGeography(
  leagueId: LeagueId,
  stats: RefStatsFile,
): RefStatsFile {
  const findingLeague = LEAGUE_ID_TO_FINDING[leagueId];
  if (!findingLeague) return stats;
  return mergeRefGeographyIntoStats(stats, findingLeague);
}

/** Resolve birthplace (preferred) or hometown for a ref slug. */
export function resolveRefBirthplace(
  slug: string,
  stats: RefStatsFile,
  league: FindingLeague,
): string | null {
  const profile = stats.refs.find((ref) => ref.slug === slug);
  const fromProfile = profile?.birthplace?.trim() || profile?.hometown?.trim();
  if (fromProfile) return fromProfile;

  const fromStatsIndex = stats.refGeography?.[slug];
  const fromIndex =
    fromStatsIndex?.birthplace?.trim() || fromStatsIndex?.hometown?.trim();
  if (fromIndex) return fromIndex;

  const shardEntry = getRefGeographyShard(league).officials[slug];
  const fromShard =
    shardEntry?.birthplace?.trim() || shardEntry?.hometown?.trim();
  return fromShard || null;
}
