import * as fs from "node:fs";
import * as path from "node:path";
import type { GameLogEntry } from "./game-logs";

export interface SeasonBaseline {
  season: string;
  gameCount: number;
  leagueAvgTotal: number;
  leagueOverBaseline: number;
  leagueAvgFouls: number;
  leagueAvgMinors?: number;
  leagueOvertimeRate?: number;
  leagueAvgPenaltyYards?: number;
  /** Mean closing total on external-line games only, when present. */
  meanClosingTotal?: number;
}

export interface LeagueBaselines {
  currentSeason: string | null;
  seasons: Record<string, SeasonBaseline>;
  /** All-game aggregate across loaded logs. */
  aggregate: SeasonBaseline;
  usingFallback: boolean;
}

export interface BaselinesFile {
  generatedAt: string;
  note?: string;
  fallback: {
    NBA: Omit<SeasonBaseline, "season" | "gameCount"> & { label: string };
    NFL: Omit<SeasonBaseline, "season" | "gameCount"> & { label: string };
    CBB: Omit<SeasonBaseline, "season" | "gameCount"> & { label: string };
    CFB: Omit<SeasonBaseline, "season" | "gameCount"> & { label: string };
    EPL: Omit<SeasonBaseline, "season" | "gameCount"> & { label: string };
    NHL: Omit<SeasonBaseline, "season" | "gameCount"> & { label: string };
  };
  NBA: LeagueBaselines;
  NHL: LeagueBaselines;
  NFL: LeagueBaselines;
  CBB: LeagueBaselines;
  CFB: LeagueBaselines;
  EPL: LeagueBaselines;
}

export const FALLBACK_NBA = {
  label: "NBA static fallback (empty or missing game logs)",
  leagueAvgTotal: 225,
  leagueOverBaseline: 225,
  leagueAvgFouls: 38.5,
} as const;

export const FALLBACK_CBB = {
  label: "CBB static fallback (empty or missing game logs)",
  leagueAvgTotal: 145,
  leagueOverBaseline: 145,
  leagueAvgFouls: 36,
} as const;

export const FALLBACK_CFB = {
  label: "CFB static fallback (empty or missing game logs)",
  leagueAvgTotal: 52,
  leagueOverBaseline: 52,
  leagueAvgFouls: 10,
  leagueAvgPenaltyYards: 60,
} as const;

export const FALLBACK_EPL = {
  label: "EPL static fallback (empty or missing game logs)",
  leagueAvgTotal: 2.8,
  leagueOverBaseline: 2.5,
  leagueAvgFouls: 22,
} as const;

export const FALLBACK_NFL={label:"NFL",leagueAvgTotal:45.8,leagueOverBaseline:46,leagueAvgFouls:13,leagueAvgPenaltyYards:95} as const;
export const FALLBACK_NHL = {
  label: "NHL static fallback (empty or missing game logs)",
  leagueAvgTotal: 6.2,
  leagueOverBaseline: 6.2,
  leagueAvgFouls: 11,
  leagueAvgMinors: 5.5,
  leagueOvertimeRate: 0.23,
} as const;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function computeSeasonBaseline(
  season: string,
  games: GameLogEntry[],
): SeasonBaseline {
  const n = games.length;
  const totalPoints = games.reduce((s, g) => s + g.totalPoints, 0);
  const totalFouls = games.reduce((s, g) => s + g.totalFouls, 0);
  const external = games.filter((g) => g.lineSource === "external");
  const meanClosing =
    external.length > 0
      ? external.reduce((s, g) => s + g.closingTotal, 0) / external.length
      : undefined;

  const withMinors = games.filter(
    (g) => g.homeMinors !== undefined && g.awayMinors !== undefined,
  );
  const withPenaltyYards = games.filter(
    (g) =>
      g.homePenaltyYards !== undefined && g.awayPenaltyYards !== undefined,
  );
  const otTracked = games.some((g) => g.wentToOvertime !== undefined);
  const otGames = games.filter((g) => g.wentToOvertime === true);

  const leagueAvgTotal = n > 0 ? round1(totalPoints / n) : FALLBACK_NBA.leagueAvgTotal;
  const leagueOverBaseline =
    meanClosing !== undefined
      ? round1(meanClosing)
      : leagueAvgTotal;

  return {
    season,
    gameCount: n,
    leagueAvgTotal,
    leagueOverBaseline,
    leagueAvgFouls: n > 0 ? round1(totalFouls / n) : FALLBACK_NBA.leagueAvgFouls,
    leagueAvgMinors:
      withMinors.length > 0
        ? round1(
            withMinors.reduce(
              (s, g) => s + g.homeMinors! + g.awayMinors!,
              0,
            ) / withMinors.length,
          )
        : undefined,
    leagueOvertimeRate: otTracked ? round3(otGames.length / n) : undefined,
    leagueAvgPenaltyYards:
      withPenaltyYards.length > 0
        ? round1(
            withPenaltyYards.reduce(
              (s, g) => s + g.homePenaltyYards! + g.awayPenaltyYards!,
              0,
            ) / withPenaltyYards.length,
          )
        : undefined,
    meanClosingTotal:
      meanClosing !== undefined ? round1(meanClosing) : undefined,
  };
}

export function computeLeagueBaselines(
  league: "NBA" | "NHL" | "NFL" | "CBB" | "CFB" | "EPL",
  games: GameLogEntry[],
): LeagueBaselines {
  if (games.length === 0) {
    const fb = fallbackForLeague(league);
    const empty: SeasonBaseline = {
      season: "none",
      gameCount: 0,
      leagueAvgTotal: fb.leagueAvgTotal,
      leagueOverBaseline: fb.leagueOverBaseline,
      leagueAvgFouls: fb.leagueAvgFouls,
      leagueAvgMinors: "leagueAvgMinors" in fb ? fb.leagueAvgMinors : undefined,
      leagueOvertimeRate:
        "leagueOvertimeRate" in fb ? fb.leagueOvertimeRate : undefined,
    };
    return {
      currentSeason: null,
      seasons: {},
      aggregate: empty,
      usingFallback: true,
    };
  }

  const seasons = [...new Set(games.map((g) => g.season))].sort();
  const bySeason: Record<string, SeasonBaseline> = {};
  for (const season of seasons) {
    bySeason[season] = computeSeasonBaseline(
      season,
      games.filter((g) => g.season === season),
    );
  }

  const aggregate = computeSeasonBaseline("all", games);
  aggregate.season = "all";

  return {
    currentSeason: seasons.at(-1) ?? null,
    seasons: bySeason,
    aggregate,
    usingFallback: false,
  };
}

export function fallbackForLeague(
  l: "NBA" | "NHL" | "NFL" | "CBB" | "CFB" | "EPL",
) {
  if (l === "NBA") return FALLBACK_NBA;
  if (l === "NFL") return FALLBACK_NFL;
  if (l === "CBB") return FALLBACK_CBB;
  if (l === "CFB") return FALLBACK_CFB;
  if (l === "EPL") return FALLBACK_EPL;
  return FALLBACK_NHL;
}
export function buildBaselinesFile(
  nbaGames: GameLogEntry[],
  nhlGames: GameLogEntry[],
  note?: string,
  nflGames: GameLogEntry[] = [],
  eplGames: GameLogEntry[] = [],
): BaselinesFile {
  return {
    generatedAt: new Date().toISOString(),
    note,
    fallback: {
      NBA: { ...FALLBACK_NBA },
      NHL: { ...FALLBACK_NHL },
      NFL: { ...FALLBACK_NFL },
      CBB: { ...FALLBACK_CBB },
      CFB: { ...FALLBACK_CFB },
      EPL: { ...FALLBACK_EPL },
    },
    NBA: computeLeagueBaselines("NBA", nbaGames),
    NHL: computeLeagueBaselines("NHL", nhlGames),
    NFL: computeLeagueBaselines("NFL", nflGames),
    CBB: computeLeagueBaselines("CBB", []),
    CFB: computeLeagueBaselines("CFB", []),
    EPL: computeLeagueBaselines("EPL", eplGames),
  };
}

export function saveBaselines(file: BaselinesFile): void {
  const outPath = path.join(process.cwd(), "data", "baselines.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
}

export function loadBaselines(): BaselinesFile | null {
  const outPath = path.join(process.cwd(), "data", "baselines.json");
  try {
    return JSON.parse(fs.readFileSync(outPath, "utf8")) as BaselinesFile;
  } catch {
    return null;
  }
}

/** Prior-game baseline for backtest (no lookahead within season). */
export function priorSeasonBaseline(
  game: GameLogEntry,
  priorGames: GameLogEntry[],
): SeasonBaseline {
  const priorSameSeason = priorGames.filter((g) => g.season === game.season);
  const pool = priorSameSeason.length >= 20 ? priorSameSeason : priorGames;
  if (pool.length === 0) {
    const fb = fallbackForLeague(game.league);
    return {
      season: game.season,
      gameCount: 0,
      leagueAvgTotal: fb.leagueAvgTotal,
      leagueOverBaseline: fb.leagueOverBaseline,
      leagueAvgFouls: fb.leagueAvgFouls,
      leagueAvgMinors:
        "leagueAvgMinors" in fb ? fb.leagueAvgMinors : undefined,
      leagueOvertimeRate:
        "leagueOvertimeRate" in fb ? fb.leagueOvertimeRate : undefined,
    };
  }
  return computeSeasonBaseline(game.season, pool);
}
