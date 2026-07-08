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
} from "../../scripts/lib/baselines";

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

type BaselineLeague = "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB" | "EPL";

const EMPTY: BaselinesFile = {
  generatedAt: "",
  fallback: {
    NBA: { ...FALLBACK_NBA },
    NHL: { ...FALLBACK_NHL },
    NFL: { ...FALLBACK_NFL },
    CBB: { ...FALLBACK_CBB },
    CFB: { ...FALLBACK_CFB },
    EPL: { ...FALLBACK_EPL },
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
};

function readBaselines(): BaselinesFile {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data", "baselines.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as BaselinesFile;
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
    };
  } catch {
    return EMPTY;
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
