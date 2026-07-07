import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AssignmentsFile,
  RefOfficial,
  RefProfile,
  RefStatsFile,
} from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");

function readJson<T>(filename: string): T {
  const filePath = path.join(dataDir, filename);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
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

const EMPTY_REF_STATS: RefStatsFile = {
  meta: {
    lastUpdated: new Date().toISOString(),
    seasons: [],
    leagueAvgTotal: 225,
    leagueAvgFouls: 38.5,
    leagueOverBaseline: 225,
    minSampleSize: 30,
    source: "seeded",
    atsAvailable: false,
    note: "No ref stats data file found. Run npm run build-ref-data.",
  },
  refs: [],
  raptorsSplits: [],
  lakersSplits: [],
};

function normalizeRefStats(data: RefStatsFile): RefStatsFile {
  return {
    ...data,
    refs: data.refs ?? [],
    raptorsSplits: data.raptorsSplits ?? [],
    lakersSplits: data.lakersSplits ?? [],
  };
}

export function getRefStats(): RefStatsFile {
  try {
    return normalizeRefStats(readJson<RefStatsFile>("ref-stats.json"));
  } catch {
    try {
      return normalizeRefStats(readJson<RefStatsFile>("ref-stats.seed.json"));
    } catch {
      return EMPTY_REF_STATS;
    }
  }
}

export function getRefBySlug(slug: string): RefProfile | undefined {
  const stats = getRefStats();
  return stats.refs.find((r) => r.slug === slug);
}

export function getAllRefSlugs(): string[] {
  return getRefStats().refs.map((r) => r.slug);
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

  const pool = qualified.length > 0 ? qualified : crew.map((o) => {
    const slug = refSlug(o.name, o.number);
    return stats.refs.find((r) => r.slug === slug);
  }).filter((r): r is RefProfile => !!r);

  const n = pool.length || 1;
  const avgTotal =
    pool.reduce((s, r) => s + r.avgTotalPoints, 0) / n;
  const overRate = pool.reduce((s, r) => s + r.overRate, 0) / n;
  const avgFouls = pool.reduce((s, r) => s + r.avgFouls, 0) / n;

  const totalDelta = avgTotal - stats.meta.leagueAvgTotal;
  const foulsDelta = avgFouls - stats.meta.leagueAvgFouls;

  let ouLean: CrewMetrics["ouLean"] = "neutral";
  if (overRate >= 0.56 || totalDelta >= 3) ouLean = "over";
  else if (overRate <= 0.44 || totalDelta <= -3) ouLean = "under";

  return {
    crew,
    qualifiedRefs: qualified,
    sampleGames: Math.round(sampleGames / (qualified.length || 1)),
    avgTotalPoints: round1(avgTotal),
    totalPointsDelta: round1(totalDelta),
    overRate: round3(overRate),
    avgFouls: round1(avgFouls),
    foulsDelta: round1(foulsDelta),
    homeCoverRate: null,
    ouLean,
    insufficientSample: qualified.length < 2,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${n}`;
}

export function whistleBias(
  foulDifferential: number,
): "team" | "opponent" | "neutral" {
  if (foulDifferential >= 1.5) return "team";
  if (foulDifferential <= -1.5) return "opponent";
  return "neutral";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
