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
import { detectTeamsInGame, NHL_TEAM_ABBRS } from "@/lib/nhl/teams";
import {
  computeOuLean,
  formatPct,
  formatSigned,
  ouLeanSortWeight,
  whistleBias,
} from "@/lib/stats-utils";
import { resolveLeagueBaseline } from "@/lib/baselines";
import { nhlCrewMetricsProvenance } from "@/lib/provenance";
import {
  attachTeamSplits,
  cachedTeamSplitsForLeague,
  getPreferHydratedRefStats,
  loadRefStatsRawCachedFirst,
  resolveTeamSplitsForLeague,
} from "@/lib/ref-stats-preload";
import { getBundledLeagueRefStatsCore } from "@/lib/ref-stats-bundled";
import { allowNodeDataFs, diskTeamSplitsFallback } from "@/lib/production-data-guard";
import { resolveLeagueVerification } from "@/lib/league-verification";
import { shouldShowUnverifiedData } from "@/lib/show-unverified";
import { isNhlLinesmanOfficial } from "@/lib/nhl/officials";
import type { MetricProvenance, SampleGateStatus } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data", "nhl");

const jsonCache = new Map<string, unknown>();

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

function loadTeamSplitsFromDisk(): Record<string, TeamCrewSplit[]> {
  return tryReadJson<Record<string, TeamCrewSplit[]>>("team-splits.json") ?? {};
}

function resolveTeamSplits(
  embedded: Record<string, TeamCrewSplit[]>,
): Record<string, TeamCrewSplit[]> {
  const cached = cachedTeamSplitsForLeague("nhl");
  if (Object.keys(cached).length > 0) {
    return resolveTeamSplitsForLeague("nhl", embedded, cached);
  }
  return resolveTeamSplitsForLeague("nhl", embedded, diskTeamSplitsFallback(loadTeamSplitsFromDisk));
}

function loadRefStatsRaw(): RefStatsFile | null {
  return loadRefStatsRawCachedFirst("nhl", () => {
    if (!allowNodeDataFs()) return getBundledLeagueRefStatsCore("nhl");
    return (
      tryReadJson<RefStatsFile>("ref-stats-core.json") ??
      tryReadJson<RefStatsFile>("ref-stats.json") ??
      getBundledLeagueRefStatsCore("nhl")
    );
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
  const bl = resolveLeagueBaseline("NHL");
  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [],
      leagueAvgTotal: bl.leagueAvgTotal,
      leagueAvgFouls: bl.leagueAvgFouls,
      leagueOverBaseline: bl.leagueOverBaseline,
      leagueAvgMinors: bl.leagueAvgMinors,
      leagueOvertimeRate: bl.leagueOvertimeRate,
      minSampleSize: 30,
      source: "seeded",
      data_verified: false,
      data_source: "synthetic",
      atsAvailable: false,
      note: "NHL verified ingest pending. No synthetic numbers in production.",
    },
    refs: [],
    teamSplits: {},
  };
})();

function gateUnverifiedNhlStats(stats: RefStatsFile): RefStatsFile {
  const v = resolveLeagueVerification("nhl", stats.meta);
  if (v.data_verified || shouldShowUnverifiedData()) return stats;
  return {
    ...stats,
    meta: {
      ...stats.meta,
      data_verified: false,
      data_source: "synthetic",
      seasons: [],
    },
    refs: [],
    teamSplits: {},
  };
}

function migrateLegacySplits(data: RefStatsFile): Record<string, TeamCrewSplit[]> {
  return { ...(data.teamSplits ?? {}) };
}

function applyBaselines(stats: RefStatsFile): RefStatsFile {
  const season = stats.meta.seasons.at(-1) ?? null;
  const baseline = resolveLeagueBaseline("NHL", season);
  return {
    ...stats,
    meta: {
      ...stats.meta,
      leagueAvgTotal: baseline.leagueAvgTotal,
      leagueAvgFouls: baseline.leagueAvgFouls,
      leagueOverBaseline: baseline.leagueOverBaseline,
      leagueAvgMinors: baseline.leagueAvgMinors ?? stats.meta.leagueAvgMinors,
      leagueOvertimeRate:
        baseline.leagueOvertimeRate ?? stats.meta.leagueOvertimeRate,
    },
  };
}

function normalizeRefStats(data: RefStatsFile): RefStatsFile {
  const embedded = data.teamSplits ?? {};
  if (Object.keys(embedded).length > 0) {
    return { ...data, refs: data.refs ?? [] };
  }
  const cached = cachedTeamSplitsForLeague("nhl");
  const fromFile =
    Object.keys(cached).length > 0 ? cached : diskTeamSplitsFallback(loadTeamSplitsFromDisk);
  return attachTeamSplits(
    "nhl",
    {
      ...data,
      refs: data.refs ?? [],
    },
    fromFile,
  );
}

function mergeTeamSpecialTeams(data: RefStatsFile): RefStatsFile {
  try {
    const st = readJson<{ teams: RefStatsFile["meta"]["teamSpecialTeams"] }>(
      "team-special-teams.json",
    );
    if (st.teams && Object.keys(st.teams).length > 0) {
      return {
        ...data,
        meta: { ...data.meta, teamSpecialTeams: st.teams },
      };
    }
  } catch {
    /* optional overlay */
  }
  return data;
}

let resolvedRefStats: RefStatsFile | null = null;

export function getRefStats(): RefStatsFile {
  try {
    const hydrated = getPreferHydratedRefStats("nhl");
    if (hydrated?.refs?.length) {
      resolvedRefStats = gateUnverifiedNhlStats(
        applyBaselines(mergeTeamSpecialTeams(normalizeRefStats(hydrated))),
      );
      return resolvedRefStats;
    }
    if (resolvedRefStats?.refs?.length) {
      resolvedRefStats = gateUnverifiedNhlStats(
        applyBaselines(mergeTeamSpecialTeams(normalizeRefStats(resolvedRefStats))),
      );
      return resolvedRefStats;
    }
    const raw = loadRefStatsRaw();
    if (!raw?.refs?.length) return EMPTY_REF_STATS;
    const stats = gateUnverifiedNhlStats(
      applyBaselines(mergeTeamSpecialTeams(normalizeRefStats(raw))),
    );
    const splits = cachedTeamSplitsForLeague("nhl");
    const fromFile =
      Object.keys(splits).length > 0 ? splits : diskTeamSplitsFallback(loadTeamSplitsFromDisk);
    resolvedRefStats = attachTeamSplits("nhl", stats, fromFile);
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
    if (isNhlLinesmanOfficial(official)) continue;
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
      provenance: nhlCrewMetricsProvenance(stats, 0, 0),
    };
  }

  const pool = qualified;
  const n = pool.length;
  const avgTotal = pool.reduce((s, r) => s + r.avgTotalPoints, 0) / n;
  const overRate = pool.reduce((s, r) => s + r.overRate, 0) / n;
  const avgFouls = pool.reduce((s, r) => s + r.avgFouls, 0) / n;

  const totalDelta = avgTotal - stats.meta.leagueAvgTotal;
  const foulsDelta = avgFouls - stats.meta.leagueAvgFouls;

  let ouLean: CrewMetrics["ouLean"] = "neutral";
  if (overRate >= 0.56 || totalDelta >= 0.4) ouLean = "over";
  else if (overRate <= 0.44 || totalDelta <= -0.4) ouLean = "under";

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
    provenance: nhlCrewMetricsProvenance(
      stats,
      qualified.length,
      avgSampleGames,
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
  return resolveTeamSplits(stats.teamSplits ?? {})[abbr.toUpperCase()] ?? [];
}

export function getAllTeamAbbrs(): string[] {
  const fromSplits = Object.keys(getRefStats().teamSplits);
  if (fromSplits.length > 0) {
    return fromSplits.sort();
  }
  return [...NHL_TEAM_ABBRS];
}

export { detectTeamsInGame, getTeam, matchTeamString } from "@/lib/nhl/teams";
export type { NhlTeam } from "@/lib/nhl/teams";

export function gameHasTeamSplits(game: AssignmentGame): boolean {
  return detectTeamsInGame(game.awayTeam, game.homeTeam).some(
    (team) => getTeamSplits(team.abbr).length > 0,
  );
}

export function sortSplitsByGames<T extends TeamCrewSplit>(splits: T[]): T[] {
  return [...splits].sort((a, b) => b.games - a.games);
}

export { formatPct, formatSigned, whistleBias, ouLeanSortWeight, computeOuLean };
