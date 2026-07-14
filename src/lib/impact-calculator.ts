import type {
  NflPenaltyEvent,
  NflPenaltyTypeSlug,
  PenaltyLeverageState,
  PenaltyLeverageTier,
} from "@/lib/types";

/** Situational inputs before leverage tiering and scoring. */
export type PenaltySituationInput = {
  type: NflPenaltyTypeSlug;
  rawType?: string;
  yards?: number;
  down?: number;
  distance?: number;
  yardLine?: number;
  quarter?: number;
  gameSecondsRemaining?: number;
  scoreDifferential?: number;
  wpBefore?: number;
  wpaDelta?: number;
};

export type GameLeverageImpactSummary = {
  totalLeverageScore: number;
  highLeverageScore: number;
  flagCount: number;
  highLeverageFlagCount: number;
  criticalFlagCount: number;
};

/** Base analytical weight by penalty type (0–1 scale). */
export const PENALTY_TYPE_SEVERITY: Record<NflPenaltyTypeSlug, number> = {
  defensive_pass_interference: 1,
  offensive_pass_interference: 0.95,
  pass_interference: 0.95,
  defensive_holding: 0.82,
  roughing_passer: 0.88,
  offensive_holding: 0.55,
  unsportsmanlike_conduct: 0.72,
  illegal_contact: 0.65,
  face_mask: 0.6,
  illegal_formation: 0.35,
  false_start: 0.28,
  delay_of_game: 0.32,
  neutral_zone: 0.3,
  other: 0.45,
};

const TYPE_ALIASES: [RegExp, NflPenaltyTypeSlug][] = [
  [/defensive.?pass.?interference|dpi/i, "defensive_pass_interference"],
  [/offensive.?pass.?interference|opi/i, "offensive_pass_interference"],
  [/pass.?interference|intentional.?ground/i, "pass_interference"],
  [/defensive.?holding/i, "defensive_holding"],
  [/offensive.?holding/i, "offensive_holding"],
  [/roughing.?the.?passer|roughing.?passer/i, "roughing_passer"],
  [/false.?start/i, "false_start"],
  [/illegal.?formation/i, "illegal_formation"],
  [/delay.?of.?game/i, "delay_of_game"],
  [/unsportsmanlike/i, "unsportsmanlike_conduct"],
  [/neutral.?zone/i, "neutral_zone"],
  [/illegal.?contact/i, "illegal_contact"],
  [/face.?mask/i, "face_mask"],
  [/holding/i, "defensive_holding"],
];

export function normalizeNflPenaltyType(raw: string): NflPenaltyTypeSlug {
  const trimmed = raw.trim();
  if (!trimmed) return "other";
  for (const [pattern, slug] of TYPE_ALIASES) {
    if (pattern.test(trimmed)) return slug;
  }
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") as NflPenaltyTypeSlug;
  return slug in PENALTY_TYPE_SEVERITY ? slug : "other";
}

function isRedZone(yardLine?: number): boolean {
  return yardLine !== undefined && yardLine <= 20;
}

function isOneScoreGame(scoreDiff?: number): boolean {
  return scoreDiff !== undefined && Math.abs(scoreDiff) <= 8;
}

function isLateGame(quarter?: number, seconds?: number): boolean {
  if (quarter === undefined) return false;
  if (quarter >= 5) return true;
  if (quarter === 4 && seconds !== undefined && seconds <= 300) return true;
  return false;
}

/**
 * Classify leverage tier from down/distance, field position, and WPA delta.
 * Critical = drive-extending flags in scoring range or large WPA swings.
 */
export function classifyLeverageTier(
  input: PenaltySituationInput,
): PenaltyLeverageTier {
  const down = input.down;
  const distance = input.distance;
  const yardLine = input.yardLine;
  const wpa = input.wpaDelta;
  const absWpa = wpa !== undefined ? Math.abs(wpa) : 0;

  if (absWpa >= 0.06) return "critical";
  if (down === 4) return "critical";
  if (
    down === 3 &&
    distance !== undefined &&
    distance >= 7 &&
    (isRedZone(yardLine) || isLateGame(input.quarter, input.gameSecondsRemaining))
  ) {
    return "critical";
  }

  if (absWpa >= 0.03) return "high";
  if (down === 3 && distance !== undefined && distance >= 7) return "high";
  if (isRedZone(yardLine) && down !== undefined && down >= 2) return "high";
  if (
    isLateGame(input.quarter, input.gameSecondsRemaining) &&
    isOneScoreGame(input.scoreDifferential) &&
    down !== undefined &&
    down >= 3
  ) {
    return "high";
  }

  if (absWpa >= 0.015) return "moderate";
  if (down === 3) return "moderate";
  if (isRedZone(yardLine)) return "moderate";

  const routineTypes: NflPenaltyTypeSlug[] = [
    "false_start",
    "delay_of_game",
    "illegal_formation",
    "neutral_zone",
  ];
  if (routineTypes.includes(input.type) && down === 1) return "routine";

  return "moderate";
}

export function buildLeverageState(
  input: PenaltySituationInput,
): PenaltyLeverageState {
  return {
    down: input.down,
    distance: input.distance,
    yardLine: input.yardLine,
    quarter: input.quarter,
    gameSecondsRemaining: input.gameSecondsRemaining,
    scoreDifferential: input.scoreDifferential,
    wpBefore: input.wpBefore,
    wpaDelta: input.wpaDelta,
    tier: classifyLeverageTier(input),
  };
}

const TIER_MULTIPLIER: Record<PenaltyLeverageTier, number> = {
  routine: 0.55,
  moderate: 1,
  high: 1.45,
  critical: 2.1,
};

/**
 * Dynamic leverage score for one penalty.
 * Defensive holding on 3rd-and-long that extends a drive scores far above
 * a 1st-quarter false start.
 */
export function computeLeverageScore(input: PenaltySituationInput): number {
  const leverage = buildLeverageState(input);
  const base = PENALTY_TYPE_SEVERITY[input.type] ?? PENALTY_TYPE_SEVERITY.other;

  let situational = 1;
  if (input.down === 4) situational *= 1.35;
  else if (input.down === 3) situational *= 1.2;
  if (input.distance !== undefined && input.distance >= 7) situational *= 1.12;
  if (isRedZone(input.yardLine)) situational *= 1.18;
  if (isLateGame(input.quarter, input.gameSecondsRemaining)) situational *= 1.1;
  if (isOneScoreGame(input.scoreDifferential)) situational *= 1.08;

  let wpaBoost = 1;
  if (input.wpaDelta !== undefined) {
    wpaBoost += Math.min(1.5, Math.abs(input.wpaDelta) * 12);
  }

  const yardsBoost =
    input.yards !== undefined && input.yards >= 15 ? 1.08 : 1;

  const raw =
    base *
    TIER_MULTIPLIER[leverage.tier] *
    situational *
    wpaBoost *
    yardsBoost;

  return Math.round(raw * 1000) / 1000;
}

export function buildPenaltyEvent(
  rawType: string,
  team: string,
  yards: number,
  situation: Omit<PenaltySituationInput, "type" | "rawType" | "yards">,
  accepted = true,
): NflPenaltyEvent {
  const type = normalizeNflPenaltyType(rawType);
  const leverageScore = computeLeverageScore({
    type,
    rawType,
    yards,
    ...situation,
  });
  return {
    type,
    rawType,
    team,
    yards,
    accepted,
    leverage: buildLeverageState({ type, yards, ...situation }),
    leverageScore,
  };
}

export function isHighLeverageTier(tier: PenaltyLeverageTier): boolean {
  return tier === "high" || tier === "critical";
}

export function aggregateGameLeverageImpact(
  events: NflPenaltyEvent[],
): GameLeverageImpactSummary {
  const accepted = events.filter((event) => event.accepted);
  let totalLeverageScore = 0;
  let highLeverageScore = 0;
  let highLeverageFlagCount = 0;
  let criticalFlagCount = 0;

  for (const event of accepted) {
    totalLeverageScore += event.leverageScore;
    if (isHighLeverageTier(event.leverage.tier)) {
      highLeverageScore += event.leverageScore;
      highLeverageFlagCount += 1;
    }
    if (event.leverage.tier === "critical") {
      criticalFlagCount += 1;
    }
  }

  return {
    totalLeverageScore: round3(totalLeverageScore),
    highLeverageScore: round3(highLeverageScore),
    flagCount: accepted.length,
    highLeverageFlagCount,
    criticalFlagCount,
  };
}

/** League-average leverage per flag when play-level events are unavailable. */
export const ESTIMATED_LEVERAGE_PER_FLAG = 0.62;

export function estimateGameLeverageFromFlagTotals(
  homeFlags = 0,
  awayFlags = 0,
): number {
  return round3((homeFlags + awayFlags) * ESTIMATED_LEVERAGE_PER_FLAG);
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export const LEAGUE_AVG_HIGH_LEVERAGE_IMPACT = 8.2;
