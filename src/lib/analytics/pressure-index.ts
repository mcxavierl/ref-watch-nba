import type { GameScoutingMetadata } from "@/lib/analytics/scouting-report-types";
import { classifyMarqueeGame } from "@/lib/marquee-games";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import {
  hasWhistlePeriodSplits,
  type WhistlePeriodSplits,
} from "@/lib/whistle-period-splits";

export const PRESSURE_INDEX_BASELINE = 100;
export const PRESSURE_INDEX_MIN_GAMES = 3;
export const LATE_GAME_SCORE_MARGIN = 5;

export type PressureFlagReason =
  | "playoff"
  | "elimination"
  | "national-tv"
  | "late-close-game";

export type PressureContextGameInput = {
  homeScore: number;
  awayScore: number;
  date?: string;
  season?: string;
  isPlayoff?: boolean;
  isElimination?: boolean;
  isPrimetime?: boolean;
  whistlePeriodSplits?: WhistlePeriodSplits;
};

export type PressureContextResult = {
  pressureFlag: boolean;
  reasons: PressureFlagReason[];
};

export type PressureTendencyLabel =
  | "tightens-under-pressure"
  | "stable-under-pressure"
  | "swallows-whistle-under-pressure"
  | "insufficient-sample";

export const PRESSURE_TENDENCY_DISPLAY: Record<
  Exclude<PressureTendencyLabel, "insufficient-sample">,
  string
> = {
  "tightens-under-pressure": "Tightens under pressure",
  "stable-under-pressure": "Stable under pressure",
  "swallows-whistle-under-pressure": "Swallows whistle under pressure",
};

export type PressureIndexResult = {
  pressure_index: number | null;
  pressure_tendency_label: PressureTendencyLabel;
  baseline_whistle_rate: number | null;
  pressure_whistle_rate: number | null;
  pressure_game_sample: number;
  baseline_game_sample: number;
};

export type PressureIndexGameInput = PressureContextGameInput & {
  whistleTotal: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function scoreMargin(homeScore: number, awayScore: number): number {
  return Math.abs(homeScore - awayScore);
}

function lastRegulationPeriod(splits: WhistlePeriodSplits): number | null {
  if (splits.unit === "quarter") return 4;
  if (splits.unit === "period") return 3;
  if (splits.unit === "half") return 2;
  return null;
}

function inferPlayoffFromDate(date: string | undefined, leagueId: LeagueId): boolean {
  if (!date) return false;
  const month = Number.parseInt(date.slice(5, 7), 10);
  const day = Number.parseInt(date.slice(8, 10), 10);
  if (Number.isNaN(month) || Number.isNaN(day)) return false;

  switch (leagueId) {
    case "nba":
    case "wnba":
      return (month === 4 && day >= 15) || month === 5 || month === 6;
    case "nhl":
      return month >= 4 && month <= 6;
    case "nfl":
      return month === 1 || month === 2;
    case "epl":
    case "laliga":
      return month >= 4 && month <= 5;
    default:
      return false;
  }
}

function isLateCloseGameState(game: PressureContextGameInput): boolean {
  if (scoreMargin(game.homeScore, game.awayScore) > LATE_GAME_SCORE_MARGIN) {
    return false;
  }

  if (!hasWhistlePeriodSplits(game.whistlePeriodSplits)) {
    return true;
  }

  const latePeriod = lastRegulationPeriod(game.whistlePeriodSplits);
  if (!latePeriod) return true;

  return game.whistlePeriodSplits.buckets.some(
    (bucket) => bucket.period === latePeriod && bucket.home + bucket.away > 0,
  );
}

function isNationalTelecast(
  game: PressureContextGameInput,
  leagueId: LeagueId,
): boolean {
  if (game.isPrimetime) return true;
  if (!game.date) return false;

  const runtimeGame = {
    date: game.date,
    season: game.season ?? "",
    homeTeam: "",
    awayTeam: "",
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    homeSpread: 0,
  } as RuntimeGameLogEntry;

  const marquee = classifyMarqueeGame(runtimeGame, leagueId);
  return marquee.tags.includes("prime-time");
}

/** Tag a game with pressure context based on stakes and late-game score state. */
export function classifyPressureContext(
  game: PressureContextGameInput,
  leagueId: LeagueId,
  metadata?: Pick<GameScoutingMetadata, "isPlayoff" | "isPrimetime" | "seasonStage">,
): PressureContextResult {
  const reasons: PressureFlagReason[] = [];

  const playoff =
    game.isPlayoff ||
    metadata?.isPlayoff === true ||
    metadata?.seasonStage === "playoff" ||
    inferPlayoffFromDate(game.date, leagueId);
  if (playoff) reasons.push("playoff");

  if (game.isElimination) reasons.push("elimination");

  if (isNationalTelecast(game, leagueId) || metadata?.isPrimetime) {
    reasons.push("national-tv");
  }

  if (isLateCloseGameState(game)) {
    reasons.push("late-close-game");
  }

  return {
    pressureFlag: reasons.length > 0,
    reasons,
  };
}

export function classifyPressureTendency(
  pressureIndex: number | null,
  pressureSample: number,
  baselineSample: number,
): PressureTendencyLabel {
  if (
    pressureIndex === null ||
    pressureSample < PRESSURE_INDEX_MIN_GAMES ||
    baselineSample < PRESSURE_INDEX_MIN_GAMES
  ) {
    return "insufficient-sample";
  }
  if (pressureIndex > 105) return "tightens-under-pressure";
  if (pressureIndex < 95) return "swallows-whistle-under-pressure";
  return "stable-under-pressure";
}

export function pressureTendencyDisplayLabel(
  label: PressureTendencyLabel,
): string {
  if (label === "insufficient-sample") return "Insufficient pressure sample";
  return PRESSURE_TENDENCY_DISPLAY[label];
}

/** Compare baseline whistle rate vs pressure-flagged games. 100 = neutral. */
export function computePressureIndex(
  leagueId: LeagueId,
  games: PressureIndexGameInput[],
  metadata?: GameScoutingMetadata,
): PressureIndexResult {
  let baselineWhistleSum = 0;
  let baselineGameSample = 0;
  let pressureWhistleSum = 0;
  let pressureGameSample = 0;

  for (const game of games) {
    const context = classifyPressureContext(game, leagueId, metadata);
    if (context.pressureFlag) {
      pressureWhistleSum += game.whistleTotal;
      pressureGameSample += 1;
    } else {
      baselineWhistleSum += game.whistleTotal;
      baselineGameSample += 1;
    }
  }

  const baselineRate =
    baselineGameSample > 0 ? baselineWhistleSum / baselineGameSample : null;
  const pressureRate =
    pressureGameSample > 0 ? pressureWhistleSum / pressureGameSample : null;

  let pressureIndex: number | null = null;
  if (
    baselineRate !== null &&
    pressureRate !== null &&
    baselineRate > 0 &&
    pressureGameSample >= PRESSURE_INDEX_MIN_GAMES &&
    baselineGameSample >= PRESSURE_INDEX_MIN_GAMES
  ) {
    pressureIndex = round1((pressureRate / baselineRate) * PRESSURE_INDEX_BASELINE);
  }

  return {
    pressure_index: pressureIndex,
    pressure_tendency_label: classifyPressureTendency(
      pressureIndex,
      pressureGameSample,
      baselineGameSample,
    ),
    baseline_whistle_rate:
      baselineRate !== null ? round1(baselineRate) : null,
    pressure_whistle_rate:
      pressureRate !== null ? round1(pressureRate) : null,
    pressure_game_sample: pressureGameSample,
    baseline_game_sample: baselineGameSample,
  };
}

export function pressureFieldsFromResult(
  result: PressureIndexResult,
): Pick<
  import("@/lib/types").OfficialStats,
  | "pressure_index"
  | "pressure_tendency_label"
  | "pressure_baseline_whistle_rate"
  | "pressure_context_whistle_rate"
> {
  return {
    pressure_index: result.pressure_index,
    pressure_tendency_label: result.pressure_tendency_label,
    pressure_baseline_whistle_rate: result.baseline_whistle_rate,
    pressure_context_whistle_rate: result.pressure_whistle_rate,
  };
}
