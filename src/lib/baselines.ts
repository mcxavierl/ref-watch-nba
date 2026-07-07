import * as fs from "node:fs";
import * as path from "node:path";
import type { BaselinesFile, SeasonBaseline } from "../../scripts/lib/baselines";
import {
  FALLBACK_NBA,
  FALLBACK_NHL,
} from "../../scripts/lib/baselines";

export type BaselineSource = "computed" | "fallback";

export interface ResolvedBaseline {
  leagueAvgTotal: number;
  leagueOverBaseline: number;
  leagueAvgFouls: number;
  leagueAvgMinors?: number;
  leagueOvertimeRate?: number;
  source: BaselineSource;
  season: string | null;
}

const EMPTY: BaselinesFile = {
  generatedAt: "",
  fallback: {
    NBA: { ...FALLBACK_NBA },
    NHL: { ...FALLBACK_NHL },
  },
  NBA: {
    currentSeason: null,
    seasons: {},
    aggregate: {
      season: "all",
      gameCount: 0,
      ...FALLBACK_NBA,
    },
    usingFallback: true,
  },
  NHL: {
    currentSeason: null,
    seasons: {},
    aggregate: {
      season: "all",
      gameCount: 0,
      ...FALLBACK_NHL,
    },
    usingFallback: true,
  },
};

function readBaselines(): BaselinesFile {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data", "baselines.json"),
      "utf8",
    );
    return JSON.parse(raw) as BaselinesFile;
  } catch {
    return EMPTY;
  }
}

function pickSeasonBaseline(
  league: "NBA" | "NHL",
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
      },
    };
  }

  const key = season && block.seasons[season] ? season : block.currentSeason;
  const chosen =
    (key && block.seasons[key]) || block.aggregate;
  return { baseline: chosen, source: "computed" };
}

export function resolveLeagueBaseline(
  league: "NBA" | "NHL",
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
    source,
    season: baseline.season === "all" ? file[league].currentSeason : baseline.season,
  };
}

export function baselineUsingFallback(league: "NBA" | "NHL"): boolean {
  const file = readBaselines();
  return file[league].usingFallback;
}

export function getBaselinesFile(): BaselinesFile {
  return readBaselines();
}
