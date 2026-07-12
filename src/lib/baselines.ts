import * as fs from "node:fs";
import * as path from "node:path";
import type { BaselinesFile, SeasonBaseline } from "../../scripts/lib/baselines";
import {
  FALLBACK_NBA,
  FALLBACK_NHL,
  FALLBACK_NFL,
  FALLBACK_CBB,
  FALLBACK_CFB,
  FALLBACK_EPL,
  FALLBACK_LALIGA,
} from "../../scripts/lib/baselines";
import baselinesJson from "../../data/baselines.json";

export type BaselineSource = "computed" | "fallback";

export interface ResolvedBaseline {
  leagueAvgTotal: number;
  leagueOverBaseline: number;
  leagueAvgFouls: number;
  leagueAvgMinors?: number;
  leagueOvertimeRate?: number;
  leagueAvgPenaltyYards?: number;
  source: BaselineSource;
  season: string | null;
}

type BaselineLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";

const EMPTY: BaselinesFile = {
  generatedAt: "",
  fallback: {
    NBA: { ...FALLBACK_NBA },
    NHL: { ...FALLBACK_NHL },
    NFL: { ...FALLBACK_NFL },
    CBB: { ...FALLBACK_CBB },
    CFB: { ...FALLBACK_CFB },
    EPL: { ...FALLBACK_EPL },
    LALIGA: { ...FALLBACK_LALIGA },
  },
  NBA: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: "all", gameCount: 0, ...FALLBACK_NBA },
    usingFallback: true,
  },
  NHL: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: "all", gameCount: 0, ...FALLBACK_NHL },
    usingFallback: true,
  },
  NFL: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: "all", gameCount: 0, ...FALLBACK_NFL },
    usingFallback: true,
  },
  CBB: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: "all", gameCount: 0, ...FALLBACK_CBB },
    usingFallback: true,
  },
  CFB: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: "all", gameCount: 0, ...FALLBACK_CFB },
    usingFallback: true,
  },
  EPL: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: "all", gameCount: 0, ...FALLBACK_EPL },
    usingFallback: true,
  },
  LALIGA: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: "all", gameCount: 0, ...FALLBACK_LALIGA },
    usingFallback: true,
  },
};

function mergeBaselinesFile(parsed: BaselinesFile): BaselinesFile {
  return {
    ...EMPTY,
    ...parsed,
    fallback: { ...EMPTY.fallback, ...parsed.fallback },
    NBA: parsed.NBA ?? EMPTY.NBA,
    NHL: parsed.NHL ?? EMPTY.NHL,
    NFL: parsed.NFL ?? EMPTY.NFL,
    CBB: parsed.CBB ?? EMPTY.CBB,
    CFB: parsed.CFB ?? EMPTY.CFB,
    EPL: parsed.EPL ?? EMPTY.EPL,
    LALIGA: parsed.LALIGA ?? EMPTY.LALIGA,
  };
}

function seasonCount(file: BaselinesFile): number {
  return (["NBA", "NHL", "NFL", "EPL", "LALIGA"] as const).reduce(
    (n, league) => n + Object.keys(file[league].seasons).length,
    0,
  );
}

/**
 * Prefer the richer of disk vs bundled JSON. Workers may have a stale traced
 * baselines.json on disk while the webpack import has the commit's copy —
 * never let the stale file blank NFL/EPL trends.
 */
function readBaselines(): BaselinesFile {
  const bundled = mergeBaselinesFile(baselinesJson as BaselinesFile);
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data", "baselines.json"),
      "utf8",
    );
    const fromFs = mergeBaselinesFile(JSON.parse(raw) as BaselinesFile);
    return seasonCount(fromFs) >= seasonCount(bundled) ? fromFs : bundled;
  } catch {
    return bundled;
  }
}

function pickSeasonBaseline(
  league: BaselineLeague,
  file: BaselinesFile,
  season?: string | null,
): { baseline: SeasonBaseline; source: BaselineSource } {
  const block = file[league];
  if (block.usingFallback || block.aggregate.gameCount === 0) {
    const fb = file.fallback[league];
    return {
      source: "fallback",
      baseline: {
        season: season ?? "fallback",
        gameCount: 0,
        leagueAvgTotal: fb.leagueAvgTotal,
        leagueOverBaseline: fb.leagueOverBaseline,
        leagueAvgFouls: fb.leagueAvgFouls,
        leagueAvgMinors: fb.leagueAvgMinors,
        leagueOvertimeRate: fb.leagueOvertimeRate,
        leagueAvgPenaltyYards: fb.leagueAvgPenaltyYards,
      },
    };
  }

  const key = season && block.seasons[season] ? season : block.currentSeason;
  const chosen = (key && block.seasons[key]) || block.aggregate;
  return { baseline: chosen, source: "computed" };
}

export function resolveLeagueBaseline(
  league: BaselineLeague,
  season?: string | null,
): ResolvedBaseline {
  const file = readBaselines();
  const { baseline, source } = pickSeasonBaseline(league, file, season);
  return {
    leagueAvgTotal: baseline.leagueAvgTotal,
    leagueOverBaseline: baseline.leagueOverBaseline,
    leagueAvgFouls: baseline.leagueAvgFouls,
    leagueAvgMinors: baseline.leagueAvgMinors,
    leagueOvertimeRate: baseline.leagueOvertimeRate,
    leagueAvgPenaltyYards: baseline.leagueAvgPenaltyYards,
    source,
    season:
      baseline.season === "all" ? file[league].currentSeason : baseline.season,
  };
}

export function baselineUsingFallback(league: BaselineLeague): boolean {
  const file = readBaselines();
  return file[league].usingFallback;
}

export function getBaselinesFile(): BaselinesFile {
  return readBaselines();
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Game-count-weighted league baseline across a season scope (hub fallback when logs are unavailable). */
export function aggregateBaselineForSeasons(
  league: BaselineLeague,
  seasons: string[],
): SeasonBaseline | null {
  const file = readBaselines();
  const block = file[league];
  const rows = seasons
    .map((season) => block.seasons[season])
    .filter((row): row is SeasonBaseline => Boolean(row));
  if (rows.length === 0) {
    if (block.aggregate.gameCount > 0 && !block.usingFallback) {
      return block.aggregate;
    }
    return null;
  }

  const gameCount = rows.reduce((sum, row) => sum + row.gameCount, 0);
  if (gameCount <= 0) return null;

  const weighted = (
    pick: (row: SeasonBaseline) => number | undefined,
  ): number | undefined => {
    const values = rows
      .map((row) => {
        const value = pick(row);
        return value === undefined ? null : { value, weight: row.gameCount };
      })
      .filter(
        (entry): entry is { value: number; weight: number } => entry !== null,
      );
    if (values.length === 0) return undefined;
    const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return undefined;
    return (
      values.reduce((sum, entry) => sum + entry.value * entry.weight, 0) /
      totalWeight
    );
  };

  const leagueAvgTotal = round1(
    weighted((row) => row.leagueAvgTotal) ?? block.aggregate.leagueAvgTotal,
  );
  const leagueAvgFouls = round1(
    weighted((row) => row.leagueAvgFouls) ?? block.aggregate.leagueAvgFouls,
  );
  const leagueOverBaseline = round1(
    weighted((row) => row.leagueOverBaseline) ?? leagueAvgTotal,
  );
  const leagueAvgMinors = weighted((row) => row.leagueAvgMinors);
  const leagueOvertimeRate = weighted((row) => row.leagueOvertimeRate);
  const leagueAvgPenaltyYards = weighted((row) => row.leagueAvgPenaltyYards);

  return {
    season: "scoped",
    gameCount,
    leagueAvgTotal,
    leagueOverBaseline,
    leagueAvgFouls,
    leagueAvgMinors:
      leagueAvgMinors !== undefined ? round1(leagueAvgMinors) : undefined,
    leagueOvertimeRate:
      leagueOvertimeRate !== undefined ? round3(leagueOvertimeRate) : undefined,
    leagueAvgPenaltyYards:
      leagueAvgPenaltyYards !== undefined
        ? round1(leagueAvgPenaltyYards)
        : undefined,
  };
}
