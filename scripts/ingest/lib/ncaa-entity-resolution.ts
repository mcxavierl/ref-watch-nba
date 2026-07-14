import * as fs from "node:fs";
import * as path from "node:path";
import {
  canonicalRefKey,
  resolveCanonicalName,
} from "../../lib/ref-identity";
import type { ProLeagueOfficialLink } from "../../../src/lib/ncaa-personnel-types";
import type { RefProfile, RefStatsFile } from "../../../src/lib/types";

const PRO_LEAGUE_DIRS = [
  { league: "nba", file: "data/ref-stats.json" },
  { league: "nba", file: "data/nba/ref-stats.json", optional: true },
  { league: "nfl", file: "data/nfl/ref-stats.json" },
  { league: "nhl", file: "data/nhl/ref-stats.json" },
  { league: "epl", file: "data/epl/ref-stats.json" },
  { league: "laliga", file: "data/laliga/ref-stats.json" },
] as const;

export type ProOfficialIndexEntry = {
  league: ProLeagueOfficialLink["league"];
  slug: string;
  name: string;
  number: number;
  canonicalKey: string;
};

function loadRefStats(filePath: string): RefStatsFile | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as RefStatsFile;
  } catch {
    return null;
  }
}

/** Build pro-league official index for cross-sport entity resolution. */
export function buildProLeagueOfficialIndex(
  root = process.cwd(),
): Map<string, ProOfficialIndexEntry[]> {
  const index = new Map<string, ProOfficialIndexEntry[]>();
  const loadedLeagues = new Set<string>();

  for (const entry of PRO_LEAGUE_DIRS) {
    if (loadedLeagues.has(entry.league)) continue;
    const filePath = path.join(root, entry.file);
    if (!fs.existsSync(filePath)) {
      if ("optional" in entry && entry.optional) continue;
      continue;
    }

    const stats = loadRefStats(filePath);
    if (!stats?.refs?.length) continue;
    loadedLeagues.add(entry.league);

    for (const ref of stats.refs) {
      const canonicalKey = canonicalRefKey(ref.name);
      const bucket = index.get(canonicalKey) ?? [];
      bucket.push({
        league: entry.league as ProLeagueOfficialLink["league"],
        slug: ref.slug,
        name: ref.name,
        number: ref.number,
        canonicalKey,
      });
      index.set(canonicalKey, bucket);

      const resolved = resolveCanonicalName(ref.name);
      if (resolved !== ref.name) {
        const aliasKey = canonicalRefKey(resolved);
        const aliasBucket = index.get(aliasKey) ?? [];
        aliasBucket.push({
          league: entry.league as ProLeagueOfficialLink["league"],
          slug: ref.slug,
          name: ref.name,
          number: ref.number,
          canonicalKey: aliasKey,
        });
        index.set(aliasKey, aliasBucket);
      }
    }
  }

  return index;
}

export function resolveProLeagueLinks(
  name: string,
  index: Map<string, ProOfficialIndexEntry[]>,
): ProLeagueOfficialLink[] {
  const key = canonicalRefKey(resolveCanonicalName(name));
  const matches = index.get(key) ?? [];
  const seen = new Set<string>();

  return matches
    .filter((match) => {
      const dedupe = `${match.league}|${match.slug}`;
      if (seen.has(dedupe)) return false;
      seen.add(dedupe);
      return true;
    })
    .map((match) => ({
      league: match.league,
      slug: match.slug,
      name: match.name,
      number: match.number,
      matchConfidence:
        match.name.toLowerCase() === name.toLowerCase() ? "exact" : "alias",
    }));
}

export function summarizeEntityResolution(
  profiles: { name: string; proLeagueLinks: ProLeagueOfficialLink[] }[],
): { matched: number; total: number } {
  const matched = profiles.filter((row) => row.proLeagueLinks.length > 0).length;
  return { matched, total: profiles.length };
}
