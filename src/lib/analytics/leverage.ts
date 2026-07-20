import type { LeagueId } from "@/lib/leagues";
import type { NflPenaltyEvent } from "@/lib/types";
import {
  hasWhistlePeriodSplits,
  type WhistlePeriodSplits,
} from "@/lib/whistle-period-splits";

/** Final two minutes of regulation used for tactical-foul filtering. */
export const LEVERAGE_REGULATION_FINAL_TWO_MINUTES = 120;

export const TACTICAL_FOUL_WEIGHT_CLOSE = 0.5;
export const TACTICAL_FOUL_WEIGHT_MIDRANGE = 1.0;
export const TACTICAL_FOUL_WEIGHT_BLOWOUT = 1.2;

export const LEVERAGE_INTENTIONAL_FOUL_FILTER_NOTE =
  "Adjusted Leverage Sensitivity filters intentional-foul noise in the final two minutes of regulation by discounting close-margin whistles and weighting blowout-margin whistles.";

export type LeverageGameInput = {
  homeScore: number;
  awayScore: number;
  totalFouls: number;
  homeFlags?: number;
  awayFlags?: number;
  homeMinors?: number;
  awayMinors?: number;
  wentToOvertime?: boolean;
  whistlePeriodSplits?: WhistlePeriodSplits;
  penaltyEvents?: NflPenaltyEvent[];
};

export type LeverageWhistleEvent = {
  /** Seconds remaining in regulation at the foul timestamp. */
  gameSecondsRemaining: number;
  homeScore?: number;
  awayScore?: number;
  /** Used when only signed differential is available (e.g. NFL PBP). */
  scoreMargin?: number;
  whistles?: number;
};

export type TacticalWhistleAggregate = {
  rawWhistles: number;
  adjustedWhistles: number;
  eventCount: number;
};

export function scoreMarginAtEvent(homeScore: number, awayScore: number): number {
  return Math.abs(homeScore - awayScore);
}

export function resolveEventScoreMargin(event: LeverageWhistleEvent): number {
  if (event.scoreMargin !== undefined) return event.scoreMargin;
  return scoreMarginAtEvent(event.homeScore ?? 0, event.awayScore ?? 0);
}

/** Tactical weighting: close games get discounted, blowouts get neutral/higher weight. */
export function tacticalFoulWeight(scoreMargin: number): number {
  if (scoreMargin <= 6) return TACTICAL_FOUL_WEIGHT_CLOSE;
  if (scoreMargin <= 10) return TACTICAL_FOUL_WEIGHT_MIDRANGE;
  return TACTICAL_FOUL_WEIGHT_BLOWOUT;
}

export function isRegulationFinalTwoMinutes(gameSecondsRemaining: number): boolean {
  return (
    gameSecondsRemaining >= 0 &&
    gameSecondsRemaining <= LEVERAGE_REGULATION_FINAL_TWO_MINUTES
  );
}

export function aggregateTacticalFinalTwoMinuteWhistles(
  events: LeverageWhistleEvent[],
): TacticalWhistleAggregate {
  let rawWhistles = 0;
  let adjustedWhistles = 0;
  let eventCount = 0;

  for (const event of events) {
    if (!isRegulationFinalTwoMinutes(event.gameSecondsRemaining)) continue;
    const whistles = event.whistles ?? 1;
    const margin = resolveEventScoreMargin(event);
    const weight = tacticalFoulWeight(margin);
    rawWhistles += whistles;
    adjustedWhistles += whistles * weight;
    eventCount += 1;
  }

  return { rawWhistles, adjustedWhistles, eventCount };
}

export function whistleEventsFromPenaltyEvents(
  events: NflPenaltyEvent[] | undefined,
): LeverageWhistleEvent[] {
  if (!events?.length) return [];
  return events
    .filter((event) => event.accepted !== false)
    .map((event) => ({
      gameSecondsRemaining: event.leverage.gameSecondsRemaining ?? Number.POSITIVE_INFINITY,
      scoreMargin: Math.abs(event.leverage.scoreDifferential ?? 0),
      whistles: 1,
    }));
}

function regulationFinalPeriodConfig(
  leagueId: LeagueId,
  splits: WhistlePeriodSplits,
): { period: number; periodSeconds: number } | null {
  if (splits.unit === "quarter") {
    const periodSeconds =
      leagueId === "nfl" || leagueId === "cfb" ? 15 * 60 : 12 * 60;
    return { period: 4, periodSeconds };
  }
  if (splits.unit === "period" || leagueId === "nhl") {
    return { period: 3, periodSeconds: 20 * 60 };
  }
  if (splits.unit === "half") {
    return { period: 2, periodSeconds: 45 * 60 };
  }
  return null;
}

/** Approximate final-two-minute whistles from the last regulation period bucket. */
export function synthesizeRegulationFinalTwoMinuteEvents(
  leagueId: LeagueId,
  game: Pick<LeverageGameInput, "homeScore" | "awayScore" | "whistlePeriodSplits">,
): LeverageWhistleEvent[] {
  if (!hasWhistlePeriodSplits(game.whistlePeriodSplits)) return [];

  const config = regulationFinalPeriodConfig(leagueId, game.whistlePeriodSplits);
  if (!config) return [];

  const bucket = game.whistlePeriodSplits.buckets.find(
    (row) => row.period === config.period,
  );
  if (!bucket) return [];

  const periodFouls = bucket.home + bucket.away;
  const finalTwoMinShare =
    LEVERAGE_REGULATION_FINAL_TWO_MINUTES / config.periodSeconds;
  const estimatedFinalTwoMinFouls = periodFouls * finalTwoMinShare;
  if (estimatedFinalTwoMinFouls <= 0) return [];

  return [
    {
      gameSecondsRemaining: LEVERAGE_REGULATION_FINAL_TWO_MINUTES / 2,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      whistles: estimatedFinalTwoMinFouls,
    },
  ];
}

export function collectLeverageWhistleEvents(
  leagueId: LeagueId,
  game: LeverageGameInput,
): LeverageWhistleEvent[] {
  const fromPbp = whistleEventsFromPenaltyEvents(game.penaltyEvents);
  if (fromPbp.length > 0) return fromPbp;
  return synthesizeRegulationFinalTwoMinuteEvents(leagueId, game);
}

/** Scale an existing late-period foul rate using tactical final-two-minute weighting. */
export function computeTacticalLateRateAdjustment(
  leagueId: LeagueId,
  game: LeverageGameInput,
  baseLateRate: number,
): { adjustedLateRate: number; eventBacked: boolean; aggregate: TacticalWhistleAggregate } {
  const events = collectLeverageWhistleEvents(leagueId, game);
  const aggregate = aggregateTacticalFinalTwoMinuteWhistles(events);

  if (aggregate.rawWhistles > 0) {
    return {
      adjustedLateRate: baseLateRate * (aggregate.adjustedWhistles / aggregate.rawWhistles),
      eventBacked: events.length > 0,
      aggregate,
    };
  }

  const margin = scoreMarginAtEvent(game.homeScore, game.awayScore);
  return {
    adjustedLateRate: baseLateRate * tacticalFoulWeight(margin),
    eventBacked: false,
    aggregate,
  };
}

/** @deprecated Prefer computeTacticalLateRateAdjustment for normalization parity. */
export function computeAdjustedFinalTwoMinuteRate(
  leagueId: LeagueId,
  game: LeverageGameInput,
): { rate: number; eventBacked: boolean; aggregate: TacticalWhistleAggregate } | null {
  const adjustment = computeTacticalLateRateAdjustment(leagueId, game, 1);
  if (adjustment.aggregate.rawWhistles <= 0) return null;
  return {
    rate: adjustment.adjustedLateRate,
    eventBacked: adjustment.eventBacked,
    aggregate: adjustment.aggregate,
  };
}
