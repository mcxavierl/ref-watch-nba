import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AssignmentsFile,
  RefOfficial,
  RefStatsFile,
  TeamCrewSplit,
} from "@/lib/types";

const dataDir = path.join(process.cwd(), "data", "wnba");

function readJson<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(dataDir, filename), "utf8");
  return JSON.parse(raw) as T;
}

function tryReadJson<T>(filename: string): T | null {
  try {
    return readJson<T>(filename);
  } catch {
    return null;
  }
}

const EMPTY_REF_STATS: RefStatsFile = {
  meta: {
    lastUpdated: new Date().toISOString(),
    seasons: [],
    leagueAvgTotal: 165,
    leagueAvgFouls: 34,
    leagueOverBaseline: 165,
    minSampleSize: 30,
    source: "seeded",
    atsAvailable: false,
    data_verified: false,
    note: "WNBA Phase 1 scaffold. Historical ingest pending.",
  },
  refs: [],
  teamSplits: {},
};

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

export function getRefStats(): RefStatsFile {
  return (
    tryReadJson<RefStatsFile>("ref-stats-core.json") ??
    tryReadJson<RefStatsFile>("ref-stats.json") ??
    EMPTY_REF_STATS
  );
}

export function formatRefStatsRange(meta: RefStatsFile["meta"]): string {
  if (!meta.seasons.length) return "Awaiting verified seasons";
  return meta.seasons.join(", ");
}

export function getTeamSplits(): Record<string, TeamCrewSplit[]> {
  return getRefStats().teamSplits ?? {};
}

export function sortSplitsByGames(splits: TeamCrewSplit[]): TeamCrewSplit[] {
  return [...splits].sort((a, b) => b.games - a.games);
}

export function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSigned(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded}`;
  return String(rounded);
}

export function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

export function crewKey(refs: Pick<RefOfficial, "name" | "number">[]): string {
  return refs
    .map((r) => refSlug(r.name, r.number))
    .sort()
    .join("|");
}
