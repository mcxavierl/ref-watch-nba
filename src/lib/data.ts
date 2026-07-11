import * as fs from "node:fs";
import * as path from "node:path";
import "@/lib/global-stats";
import type {
  AssignmentGame,
  AssignmentsFile,
  RefOfficial,
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "@/lib/types";
import { detectTeamsInGame, NBA_TEAM_ABBRS } from "@/lib/teams";
import {
  computeOuLean,
  formatPct,
  formatSigned,
  ouLeanSortWeight,
  whistleBias,
} from "@/lib/stats-utils";
import { resolveLeagueBaseline } from "@/lib/baselines";
import { crewMetricsProvenance } from "@/lib/provenance";
import {
  cachedTeamSplitsForLeague,
  getPreferHydratedRefStats,
  loadRefStatsRawCachedFirst,
} from "@/lib/ref-stats-preload";
import { allowNodeDataFs, diskTeamSplitsFallback } from "@/lib/production-data-guard";
import { getBundledNbaRefStatsCore } from "@/lib/ref-stats-bundled";
import type { MetricProvenance, SampleGateStatus } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");

const jsonCache = new Map<string, unknown>();
let teamSplitsCache: Record<string, TeamCrewSplit[]> | null = null;

function readJson<T>(filename: string): T {
  const cached = jsonCache.get(filename);
  if (cached !== undefined) return cached as T;

  const filePath = path.join(dataDir, filename);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as T;
  jsonCache.set(filename, parsed);
  return parsed;
}

function tryReadJson<T>(filename: string): T | null {
  try {
    return readJson<T>(filename);
  } catch {
    return null;
  }
}

function loadTeamSplitsRaw(): Record<string, TeamCrewSplit[]> {
  if (teamSplitsCache) return teamSplitsCache;
  const cached = cachedTeamSplitsForLeague("nba");
  if (Object.keys(cached).length > 0) {
    teamSplitsCache = cached;
    return cached;
  }
  const fromFile =
    diskTeamSplitsFallback(() =>
      tryReadJson<Record<string, TeamCrewSplit[]>>("team-splits.json") ?? {},
    );
  teamSplitsCache = fromFile;
  return fromFile;
}

function loadRefStatsRaw(): RefStatsFile | null {
  return loadRefStatsRawCachedFirst("nba", () => {
    if (!allowNodeDataFs()) return getBundledNbaRefStatsCore();
    const fromFs =
      tryReadJson<RefStatsFile>("ref-stats-core.json") ??
      tryReadJson<RefStatsFile>("ref-stats.json");
    return fromFs ?? getBundledNbaRefStatsCore();
  });
}

export function getAssignments(): AssignmentsFile {
  try {
    return readJson<AssignmentsFile>("assignments.json");
  } catch {
    return {
      lastUpdated: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      source: "seeded",
      games: [],
    };
  }
}

const EMPTY_REF_STATS: RefStatsFile = (() => {
  const bl = resolveLeagueBaseline("NBA");
  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [],
      leagueAvgTotal: bl.leagueAvgTotal,
      leagueAvgFouls: bl.leagueAvgFouls,
      leagueOverBaseline: bl.leagueOverBaseline,
      minSampleSize: 30,
      source: "seeded",
      data_verified: false,
      data_source: "synthetic",
      atsAvailable: false,
      note: "No ref stats data file found. Run npm run ingest:nba-full.",
    },
    refs: [],
    teamSplits: {},
  };
})();

function applyVerificationMeta(stats: RefStatsFile): RefStatsFile {
  const manifestPath = path.join(dataDir, "nba", "manifest.json");
  let data_verified = stats.meta.data_verified ?? false;
  let data_source = stats.meta.data_source;

  try {
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        data_verified?: boolean;
        data_source?: string;
      };
      if (manifest.data_verified) data_verified = true;
      if (manifest.data_source) data_source = manifest.data_source;
    }
  } catch {
    /* manifest optional */
  }

  if (stats.meta.data_verified) data_verified = true;
  if (stats.meta.data_source) data_source = stats.meta.data_source;

  return {
    ...stats,
    meta: {
      ...stats.meta,
      data_verified,
      data_source:
        data_source ??
        (data_verified
          ? "Basketball-Reference + NBA Stats API"
          : "synthetic"),
    },
  };
}

function migrateLegacySplits(data: RefStatsFile): Record<string, TeamCrewSplit[]> {
  const teamSplits: Record<string, TeamCrewSplit[]> = {
    ...(data.teamSplits ?? {}),
  };
  if (data.raptorsSplits?.length && !teamSplits.TOR) {
    teamSplits.TOR = data.raptorsSplits;
  }
  if (data.lakersSplits?.length && !teamSplits.LAL) {
    teamSplits.LAL = data.lakersSplits;
  }
  return teamSplits;
}

function applyBaselines(stats: RefStatsFile): RefStatsFile {
  const season = stats.meta.seasons.at(-1) ?? null;
  const baseline = resolveLeagueBaseline("NBA", season);
  return {
    ...stats,
    meta: {
      ...stats.meta,
      leagueAvgTotal: baseline.leagueAvgTotal,
      leagueAvgFouls: baseline.leagueAvgFouls,
      leagueOverBaseline: baseline.leagueOverBaseline,
    },
  };
}

function normalizeRefStats(data: RefStatsFile): RefStatsFile {
  return {
    ...data,
    refs: data.refs ?? [],
    teamSplits: migrateLegacySplits(data),
  };
}

let resolvedRefStats: RefStatsFile | null = null;

export function getRefStats(): RefStatsFile {
  try {
    const hydrated = getPreferHydratedRefStats("nba");
    if (hydrated?.refs?.length) {
      resolvedRefStats = applyBaselines(
        applyVerificationMeta(normalizeRefStats(hydrated)),
      );
      return resolvedRefStats;
    }
    if (resolvedRefStats?.refs?.length) return resolvedRefStats;
    const raw = loadRefStatsRaw();
    if (!raw?.refs?.length) return EMPTY_REF_STATS;
    resolvedRefStats = applyBaselines(
      applyVerificationMeta(normalizeRefStats(raw)),
    );
    return resolvedRefStats;
  } catch {
    return EMPTY_REF_STATS;
  }
}

export function getRefBySlug(slug: string): RefProfile | undefined {
  const stats = getRefStats();
  return stats.refs.find((r) => r.slug === slug);
}

export function getAllRefSlugs(): string[] {
  return getRefStats().refs.map((r) => r.slug);
}

export interface RefIndexEntry {
  slug: string;
  name: string;
  number: number;
}

export function getRefIndex(): RefIndexEntry[] {
  return getRefStats().refs.map((r) => ({
    slug: r.slug,
    name: r.name,
    number: r.number,
  }));
}

export function formatRefStatsRange(meta: RefStatsFile["meta"]): string {
  if (meta.dateRange) {
    return `${meta.dateRange.earliest} – ${meta.dateRange.latest}`;
  }
  return meta.seasons.join(", ");
}

export function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

export function crewKey(refs: { name: string; number: number }[]): string {
  return refs
    .map((r) => refSlug(r.name, r.number))
    .sort()
    .join("|");
}

export interface CrewMetrics {
  crew: RefOfficial[];
  qualifiedRefs: RefProfile[];
  sampleGames: number;
  avgTotalPoints: number;
  totalPointsDelta: number;
  overRate: number;
  avgFouls: number;
  foulsDelta: number;
  homeCoverRate: number | null;
  ouLean: "over" | "under" | "neutral";
  insufficientSample: boolean;
  provenance: {
    aggregate: MetricProvenance;
    scoring: MetricProvenance;
    fouls: MetricProvenance;
    overRate: MetricProvenance;
    sampleGate: SampleGateStatus;
  };
}

export function computeCrewMetrics(
  crew: RefOfficial[],
  stats: RefStatsFile,
): CrewMetrics {
  const minSample = stats.meta.minSampleSize;
  const qualified: RefProfile[] = [];
  let sampleGames = 0;

  for (const official of crew) {
    const slug = refSlug(official.name, official.number);
    const profile = stats.refs.find((r) => r.slug === slug);
    if (profile && profile.games >= minSample) {
      qualified.push(profile);
      sampleGames += profile.games;
    }
  }

  if (qualified.length === 0) {
    return {
      crew,
      qualifiedRefs: [],
      sampleGames: 0,
      avgTotalPoints: 0,
      totalPointsDelta: 0,
      overRate: 0,
      avgFouls: 0,
      foulsDelta: 0,
      homeCoverRate: null,
      ouLean: "neutral",
      insufficientSample: true,
      provenance: crewMetricsProvenance(stats, 0, 0, minSample),
    };
  }

  const pool = qualified;
  const n = pool.length;
  const avgTotal =
    pool.reduce((s, r) => s + r.avgTotalPoints, 0) / n;
  const overRate = pool.reduce((s, r) => s + r.overRate, 0) / n;
  const avgFouls = pool.reduce((s, r) => s + r.avgFouls, 0) / n;

  const totalDelta = avgTotal - stats.meta.leagueAvgTotal;
  const foulsDelta = avgFouls - stats.meta.leagueAvgFouls;

  let ouLean: CrewMetrics["ouLean"] = "neutral";
  if (overRate >= 0.56 || totalDelta >= 3) ouLean = "over";
  else if (overRate <= 0.44 || totalDelta <= -3) ouLean = "under";

  const avgSampleGames = Math.round(sampleGames / qualified.length);

  return {
    crew,
    qualifiedRefs: qualified,
    sampleGames: avgSampleGames,
    avgTotalPoints: round1(avgTotal),
    totalPointsDelta: round1(totalDelta),
    overRate: round3(overRate),
    avgFouls: round1(avgFouls),
    foulsDelta: round1(foulsDelta),
    homeCoverRate: null,
    ouLean,
    insufficientSample: qualified.length < 2,
    provenance: crewMetricsProvenance(
      stats,
      qualified.length,
      avgSampleGames,
      minSample,
    ),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getTeamSplits(abbr: string): TeamCrewSplit[] {
  const stats = getRefStats();
  const fromStats = stats.teamSplits[abbr.toUpperCase()];
  if (fromStats?.length) return fromStats;
  return loadTeamSplitsRaw()[abbr.toUpperCase()] ?? [];
}

export function getAllTeamAbbrs(): string[] {
  const stats = getRefStats();
  const fromData = Object.keys(stats.teamSplits);
  const fromSplits = Object.keys(loadTeamSplitsRaw());
  const merged = [...new Set([...fromData, ...fromSplits])];
  if (merged.length > 0) {
    return merged.sort();
  }
  return [...NBA_TEAM_ABBRS];
}

export { detectTeamsInGame, getTeam, matchTeamString } from "@/lib/teams";
export type { NbaTeam } from "@/lib/teams";

export function gameHasTeamSplits(game: AssignmentGame): boolean {
  return detectTeamsInGame(game.awayTeam, game.homeTeam).some(
    (team) => getTeamSplits(team.abbr).length > 0,
  );
}

export function sortSplitsByGames<T extends TeamCrewSplit>(splits: T[]): T[] {
  return [...splits].sort((a, b) => b.games - a.games);
}

export { formatPct, formatSigned, whistleBias, ouLeanSortWeight, computeOuLean };
