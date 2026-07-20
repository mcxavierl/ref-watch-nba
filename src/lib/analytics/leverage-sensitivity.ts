import type { LeagueId } from "@/lib/leagues";
import {
  computeTacticalLateRateAdjustment,
  LEVERAGE_INTENTIONAL_FOUL_FILTER_NOTE,
  type LeverageGameInput,
} from "@/lib/analytics/leverage";
import {
  SAMPLE_SIZE_THRESHOLD,
  type DataQualityState,
} from "@/lib/analytics/sample-size";
import type { LeveragePressureProfile } from "@/lib/types";
import {
  hasWhistlePeriodSplits,
  sumBuckets,
  type WhistlePeriodSplits,
} from "@/lib/whistle-period-splits";

export const LEVERAGE_SAMPLE_WINDOW = 50;
/** @deprecated Use SAMPLE_SIZE_THRESHOLD for professional gatekeeping. */
export const LEVERAGE_MIN_SAMPLE_GAMES = SAMPLE_SIZE_THRESHOLD;
export const LEVERAGE_MIN_CLOSE_GAMES = 3;
export const LEVERAGE_INDEX_THRESHOLD = 0.2;
export const CLOSE_GAME_SCORE_DIFF = 5;

export type { LeverageGameInput } from "@/lib/analytics/leverage";

export type LeverageIndexResult = {
  leverage_index: number | null;
  leverage_profile: LeveragePressureProfile;
  early_period_foul_rate: number | null;
  high_pressure_foul_rate: number | null;
  leverage_sample_games: number;
  close_game_sample: number;
  split_backed_games: number;
  tactical_event_backed_games: number;
  intentional_foul_noise_filtered: boolean;
  leverage_method_note: string;
  data_quality: DataQualityState;
};

function insufficientLeverageResult(
  earlyRateCount: number,
  closeGameSample: number,
  splitBackedGames: number,
  tacticalEventBackedGames = 0,
): LeverageIndexResult {
  return {
    leverage_index: null,
    leverage_profile: "neutral",
    early_period_foul_rate: null,
    high_pressure_foul_rate: null,
    leverage_sample_games: earlyRateCount,
    close_game_sample: closeGameSample,
    split_backed_games: splitBackedGames,
    tactical_event_backed_games: tacticalEventBackedGames,
    intentional_foul_noise_filtered: true,
    leverage_method_note: LEVERAGE_INTENTIONAL_FOUL_FILTER_NOTE,
    data_quality: "insufficient",
  };
}

export type PressureGaugeState = "tightens-up" | "swallows-whistle" | "neutral";

export const PRESSURE_GAUGE_LABELS: Record<PressureGaugeState, string> = {
  "tightens-up": "Tightens Up",
  "swallows-whistle": "Swallows Whistle",
  neutral: "Neutral",
};

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function isCloseGame(game: LeverageGameInput): boolean {
  return Math.abs(game.homeScore - game.awayScore) < CLOSE_GAME_SCORE_DIFF;
}

function gameWhistleTotal(leagueId: LeagueId, game: LeverageGameInput): number {
  if (leagueId === "nfl") {
    return (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  if (leagueId === "nhl") {
    return (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  return game.totalFouls;
}

function resolveLeverageWindows(
  leagueId: LeagueId,
  splits: WhistlePeriodSplits,
  wentToOvertime?: boolean,
): {
  earlyPeriods: number[];
  latePeriods: number[];
} | null {
  const periods = splits.buckets.map((bucket) => bucket.period);
  if (periods.length < 2) return null;

  if (splits.unit === "quarter") {
    const regulation = periods.filter((period) => period <= 4);
    if (regulation.length < 2) return null;
    const overtimePeriods = wentToOvertime ? periods.filter((period) => period > 4) : [];
    return {
      earlyPeriods: regulation.filter((period) => period <= 2),
      latePeriods: [...regulation.filter((period) => period >= 4), ...overtimePeriods],
    };
  }

  if (splits.unit === "half") {
    const overtimePeriods = wentToOvertime ? periods.filter((period) => period > 2) : [];
    return {
      earlyPeriods: [1],
      latePeriods: [2, ...overtimePeriods],
    };
  }

  if (splits.unit === "period" || leagueId === "nhl") {
    const overtimePeriods = wentToOvertime ? periods.filter((period) => period > 3) : [];
    return {
      earlyPeriods: periods.filter((period) => period <= 2),
      latePeriods: [3, ...overtimePeriods],
    };
  }

  return null;
}

function distributedPeriodRates(
  leagueId: LeagueId,
  game: LeverageGameInput,
): { earlyRate: number; lateRate: number } | null {
  const total = gameWhistleTotal(leagueId, game);
  if (total <= 0) return null;

  if (leagueId === "nfl" || leagueId === "cfb") {
    return { earlyRate: total * 0.5, lateRate: total * 0.5 };
  }
  if (leagueId === "nhl") {
    return { earlyRate: (total / 3) * 2, lateRate: total / 3 };
  }
  if (leagueId === "epl" || leagueId === "laliga") {
    return { earlyRate: total * 0.5, lateRate: total * 0.5 };
  }

  return { earlyRate: (total / 4) * 2, lateRate: total / 4 };
}

function splitPeriodRates(
  leagueId: LeagueId,
  game: LeverageGameInput,
): { earlyRate: number; lateRate: number; splitBacked: boolean } | null {
  if (hasWhistlePeriodSplits(game.whistlePeriodSplits)) {
    const window = resolveLeverageWindows(
      leagueId,
      game.whistlePeriodSplits,
      game.wentToOvertime,
    );
    if (!window || window.earlyPeriods.length === 0 || window.latePeriods.length === 0) {
      return null;
    }

    const early = sumBuckets(game.whistlePeriodSplits.buckets, window.earlyPeriods);
    const late = sumBuckets(game.whistlePeriodSplits.buckets, window.latePeriods);
    const earlyTotal = early.home + early.away;
    const lateTotal = late.home + late.away;
    if (earlyTotal === 0 && lateTotal === 0) return null;

    return {
      earlyRate: earlyTotal / window.earlyPeriods.length,
      lateRate: lateTotal / window.latePeriods.length,
      splitBacked: true,
    };
  }

  const distributed = distributedPeriodRates(leagueId, game);
  if (!distributed) return null;
  return { ...distributed, splitBacked: false };
}

export function classifyLeverageProfile(
  leverageIndex: number | null,
): LeveragePressureProfile {
  if (leverageIndex === null) return "neutral";
  if (leverageIndex > LEVERAGE_INDEX_THRESHOLD) return "high-leverage-sensitivity";
  if (leverageIndex < -LEVERAGE_INDEX_THRESHOLD) return "swallows-whistle";
  return "neutral";
}

export function pressureGaugeState(
  profile: LeveragePressureProfile,
): PressureGaugeState {
  if (profile === "high-leverage-sensitivity") return "tightens-up";
  if (profile === "swallows-whistle") return "swallows-whistle";
  return "neutral";
}

export function buildLeverageInsight(profile: LeveragePressureProfile): string {
  if (profile === "high-leverage-sensitivity") {
    return "Adjusted High Leverage Sensitivity: Expect increased foul-calling in the final minutes after filtering tactical intentional fouls, affecting Over/Under totals.";
  }
  if (profile === "swallows-whistle") {
    return "Swallows The Whistle: Foul frequency drops in late close-game minutes after intentional-foul filtering, which can suppress Over/Under totals.";
  }
  return "Neutral leverage profile: Late-period foul pace tracks early-quarter baselines in close games after intentional-foul filtering.";
}

export function computeLeverageIndex(
  leagueId: LeagueId,
  games: LeverageGameInput[],
  options?: { sampleWindow?: number; minSampleGames?: number },
): LeverageIndexResult {
  const sampleWindow = options?.sampleWindow ?? LEVERAGE_SAMPLE_WINDOW;
  const minSampleGames = options?.minSampleGames ?? SAMPLE_SIZE_THRESHOLD;
  const sampleGames = games.slice(-sampleWindow);

  let earlyRateSum = 0;
  let earlyRateCount = 0;
  let highPressureRateSum = 0;
  let highPressureRateCount = 0;
  let splitBackedGames = 0;
  let closeGameSample = 0;
  let tacticalEventBackedGames = 0;

  for (const game of sampleGames) {
    const rates = splitPeriodRates(leagueId, game);
    if (!rates) continue;

    earlyRateSum += rates.earlyRate;
    earlyRateCount += 1;
    if (rates.splitBacked) splitBackedGames += 1;

    if (isCloseGame(game)) {
      closeGameSample += 1;
      const tacticalLate = computeTacticalLateRateAdjustment(
        leagueId,
        game,
        rates.lateRate,
      );
      highPressureRateSum += tacticalLate.adjustedLateRate;
      if (tacticalLate.eventBacked) tacticalEventBackedGames += 1;
      highPressureRateCount += 1;
    }
  }

  if (earlyRateCount < minSampleGames) {
    return insufficientLeverageResult(
      earlyRateCount,
      closeGameSample,
      splitBackedGames,
      tacticalEventBackedGames,
    );
  }

  const earlyPeriodFoulRate = earlyRateSum / earlyRateCount;
  let highPressureFoulRate: number | null = null;
  let leverageIndex: number | null = null;

  if (highPressureRateCount >= LEVERAGE_MIN_CLOSE_GAMES && earlyPeriodFoulRate > 0) {
    highPressureFoulRate = highPressureRateSum / highPressureRateCount;
    leverageIndex = round3(
      (highPressureFoulRate - earlyPeriodFoulRate) / earlyPeriodFoulRate,
    );
  }

  const leverageProfile = classifyLeverageProfile(leverageIndex);

  return {
    leverage_index: leverageIndex,
    leverage_profile: leverageProfile,
    early_period_foul_rate: round3(earlyPeriodFoulRate),
    high_pressure_foul_rate:
      highPressureFoulRate !== null ? round3(highPressureFoulRate) : null,
    leverage_sample_games: earlyRateCount,
    close_game_sample: closeGameSample,
    split_backed_games: splitBackedGames,
    tactical_event_backed_games: tacticalEventBackedGames,
    intentional_foul_noise_filtered: true,
    leverage_method_note: LEVERAGE_INTENTIONAL_FOUL_FILTER_NOTE,
    data_quality: earlyRateCount >= minSampleGames ? "ok" : "insufficient",
  };
}

export function leverageFieldsFromResult(
  result: LeverageIndexResult,
): Pick<
  import("@/lib/types").OfficialStats,
  | "leverage_index"
  | "leverage_profile"
  | "early_period_foul_rate"
  | "high_pressure_foul_rate"
  | "leverage_sample_games"
  | "close_game_sample"
  | "split_backed_games"
  | "tactical_event_backed_games"
  | "intentional_foul_noise_filtered"
  | "leverage_method_note"
> {
  return {
    leverage_index: result.leverage_index,
    leverage_profile: result.leverage_profile,
    early_period_foul_rate: result.early_period_foul_rate,
    high_pressure_foul_rate: result.high_pressure_foul_rate,
    leverage_sample_games: result.leverage_sample_games,
    close_game_sample: result.close_game_sample,
    split_backed_games: result.split_backed_games,
    tactical_event_backed_games: result.tactical_event_backed_games,
    intentional_foul_noise_filtered: result.intentional_foul_noise_filtered,
    leverage_method_note: result.leverage_method_note,
  };
}
