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
    NFL: Omit<SeasonBaseline,"season"|"gameCount">&{label:string};
    NHL: Omit<SeasonBaseline, "season" | "gameCount"> & { label: string };
  };
  NBA: LeagueBaselines;
  NHL: LeagueBaselines;
  NFL: LeagueBaselines;
}

export const FALLBACK_NBA = {
  label: "NBA static fallback (empty or missing game logs)",
  leagueAvgTotal: 225,
  leagueOverBaseline: 225,
  leagueAvgFouls: 38.5,
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
    leagueOvertimeRate:
      otGames.length > 0 ? round3(otGames.length / n) : undefined,
    meanClosingTotal:
      meanClosing !== undefined ? round1(meanClosing) : undefined,
  };
}

export function computeLeagueBaselines(
  league: "NBA" | "NHL" | "NFL",
  games: GameLogEntry[],
): LeagueBaselines {
  if (games.length === 0) {
    const fb = league === "NBA" ? FALLBACK_NBA : FALLBACK_NHL;
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

export function fallbackForLeague(l:"NBA"|"NHL"|"NFL"){return l=="NBA"?FALLBACK_NBA:l=="NFL"?FALLBACK_NFL:FALLBACK_NHL;}
export function buildBaselinesFile(
  nbaGames: GameLogEntry[],
  nhlGames: GameLogEntry[],
  note?: string,
  nflGames: GameLogEntry[] = [],
): BaselinesFile {
  return {
    generatedAt: new Date().toISOString(),
    note,
    fallback: {
      NBA: { ...FALLBACK_NBA },
      NHL: { ...FALLBACK_NHL },
      NFL: { ...FALLBACK_NFL },
    },
    NBA: computeLeagueBaselines("NBA", nbaGames),
    NHL: computeLeagueBaselines("NHL", nhlGames),
    NFL: computeLeagueBaselines("NFL", nflGames),
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
