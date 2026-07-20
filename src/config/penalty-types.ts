import type { LeagueId } from "@/lib/leagues";
import type { NflPenaltyTypeSlug } from "@/lib/types";

/** Binary whistle taxonomy for analytical transparency. */
export type PenaltyDisposition = "subjective" | "administrative";

/** Situational inputs for leverage-weight and WPA proxy estimation. */
export type PenaltyLeverageWeightInput = {
  down?: number;
  quarter?: number;
  gameSecondsRemaining?: number;
  scoreDifferential?: number;
  wpBefore?: number;
  wpaDelta?: number;
};

/** Contextual leverage multipliers for LWIS aggregation. */
export const LWIS_LEVERAGE_MULTIPLIER = {
  /** Time remaining < 120s and one-score game (|diff| < 8). */
  crisis: 2,
  /** Third or fourth down. */
  pressure: 1.5,
  base: 1,
} as const;

/** Leverage metadata attached to penalty classification outputs. */
export type PenaltyLeverageWeight = {
  leverage_weight: number;
  /** Estimated |WPA| movement when play-level WPA is absent. */
  wpa_proxy: number;
};

/** Upper bound for a single subjective whistle WPA swing when PBP WPA is missing. */
export const LWIS_MAX_WPA_PROXY = 0.08;

export type WhistleTaxonomyLeague = Extract<
  LeagueId,
  "nba" | "nfl" | "nhl" | "epl" | "laliga"
>;

const NFL_ADMIN_SLUGS = new Set<NflPenaltyTypeSlug>([
  "false_start",
  "delay_of_game",
  "illegal_formation",
  "neutral_zone",
]);

const NFL_SUBJECTIVE_SLUGS = new Set<NflPenaltyTypeSlug>([
  "defensive_pass_interference",
  "offensive_pass_interference",
  "pass_interference",
  "defensive_holding",
  "offensive_holding",
  "roughing_passer",
  "unsportsmanlike_conduct",
  "illegal_contact",
  "face_mask",
]);

/** Objective / procedural codes — pre-snap, lineup, or clock enforcement. */
export const ADMINISTRATIVE_PENALTY_CODES: Record<
  WhistleTaxonomyLeague,
  readonly string[]
> = {
  nfl: [
    "false_start",
    "delay_of_game",
    "illegal_formation",
    "neutral_zone_infraction",
    "neutral_zone",
    "illegal_shift",
    "illegal_motion",
    "illegal_substitution",
    "too_many_men",
    "too_many_men_on_field",
    "encroachment",
    "illegal_snap",
    "ineligible_downfield",
    "intentional_grounding",
  ],
  nba: [
    "delay_of_game",
    "delay",
    "kicked_ball",
    "kicked_ball_violation",
    "lane_violation",
    "defensive_three_seconds",
    "three_in_key",
    "too_many_players",
    "too_many_men",
    "jump_ball_violation",
    "five_second_violation",
    "eight_second_violation",
    "shot_clock_violation",
    "backcourt",
    "excess_timeout",
    "illegal_defense",
  ],
  nhl: [
    "too_many_men",
    "too_many_men_on_ice",
    "delay_of_game",
    "face_off_violation",
    "illegal_equipment",
    "unsuccessful_challenge",
    "bench",
    "playing_with_broken_stick",
    "closing_hand",
  ],
  epl: [
    "offside",
    "encroachment",
    "backpass",
    "time_wasting",
    "delaying_restart",
    "dissent_procedural",
    "substitution_infringement",
    "entering_field",
    "leaving_field",
    "persistent_infringement_procedural",
  ],
  laliga: [
    "offside",
    "encroachment",
    "backpass",
    "time_wasting",
    "delaying_restart",
    "dissent_procedural",
    "substitution_infringement",
    "entering_field",
    "leaving_field",
    "persistent_infringement_procedural",
  ],
};

/** Judgment / contact / interference — discretionary enforcement. */
export const SUBJECTIVE_PENALTY_CODES: Record<
  WhistleTaxonomyLeague,
  readonly string[]
> = {
  nfl: [
    "defensive_holding",
    "offensive_holding",
    "holding",
    "pass_interference",
    "defensive_pass_interference",
    "offensive_pass_interference",
    "dpi",
    "opi",
    "roughing_the_passer",
    "roughing_passer",
    "roughing",
    "block_in_the_back",
    "illegal_block",
    "unnecessary_roughness",
    "unsportsmanlike_conduct",
    "face_mask",
    "illegal_contact",
    "horse_collar",
    "personal_foul",
    "targeting",
  ],
  nba: [
    "personal_foul",
    "shooting_foul",
    "offensive_foul",
    "charging",
    "blocking",
    "loose_ball_foul",
    "reach_in",
    "technical_foul",
    "flagrant",
    "flagrant_1",
    "flagrant_2",
    "clear_path",
    "away_from_play",
    "take_foul",
    "illegal_screen",
    "hand_check",
  ],
  nhl: [
    "hooking",
    "tripping",
    "slashing",
    "interference",
    "holding",
    "holding_the_stick",
    "cross_checking",
    "high_sticking",
    "roughing",
    "boarding",
    "charging",
    "elbowing",
    "kneeing",
    "spearing",
    "unsportsmanlike_conduct",
    "embellishment",
    "goaltender_interference",
  ],
  epl: [
    "foul",
    "handball",
    "dangerous_play",
    "serious_foul_play",
    "violent_conduct",
    "dissent",
    "simulation",
    "shirt_pull",
    "holding",
    "reckless_challenge",
    "penalty_foul",
    "yellow_card_foul",
    "red_card_foul",
  ],
  laliga: [
    "foul",
    "handball",
    "dangerous_play",
    "serious_foul_play",
    "violent_conduct",
    "dissent",
    "simulation",
    "shirt_pull",
    "holding",
    "reckless_challenge",
    "penalty_foul",
    "yellow_card_foul",
    "red_card_foul",
  ],
};

/** Default subjective share when only aggregate whistle counts exist (no play-level codes). */
export const LEAGUE_DEFAULT_SUBJECTIVE_SHARE: Record<
  WhistleTaxonomyLeague,
  number
> = {
  nfl: 0.58,
  nba: 0.9,
  nhl: 0.86,
  epl: 0.78,
  laliga: 0.78,
};

function normalizeCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function matchesCodeList(code: string, list: readonly string[]): boolean {
  const normalized = normalizeCode(code);
  if (list.includes(normalized)) return true;
  return list.some(
    (entry) =>
      normalized.includes(entry) ||
      entry.includes(normalized) ||
      normalized.replace(/_/g, "").includes(entry.replace(/_/g, "")),
  );
}

export function isWhistleTaxonomyLeague(
  leagueId: LeagueId,
): leagueId is WhistleTaxonomyLeague {
  return (
    leagueId === "nba" ||
    leagueId === "nfl" ||
    leagueId === "nhl" ||
    leagueId === "epl" ||
    leagueId === "laliga"
  );
}

/** Classify a normalized or raw penalty code for a league. */
export function classifyPenaltyCode(
  league: WhistleTaxonomyLeague,
  rawCode: string,
): PenaltyDisposition {
  const code = normalizeCode(rawCode);
  if (!code) return "subjective";

  if (matchesCodeList(code, ADMINISTRATIVE_PENALTY_CODES[league])) {
    return "administrative";
  }
  if (matchesCodeList(code, SUBJECTIVE_PENALTY_CODES[league])) {
    return "subjective";
  }

  if (league === "nfl") {
    const slug = code as NflPenaltyTypeSlug;
    if (NFL_ADMIN_SLUGS.has(slug)) return "administrative";
    if (NFL_SUBJECTIVE_SLUGS.has(slug)) return "subjective";
  }

  return "subjective";
}

export function classifyNflPenaltySlug(
  slug: NflPenaltyTypeSlug,
): PenaltyDisposition {
  if (NFL_ADMIN_SLUGS.has(slug)) return "administrative";
  if (NFL_SUBJECTIVE_SLUGS.has(slug)) return "subjective";
  return classifyPenaltyCode("nfl", slug);
}

export function splitAggregateWhistleCount(
  league: WhistleTaxonomyLeague,
  total: number,
): { subjective: number; administrative: number } {
  const share = LEAGUE_DEFAULT_SUBJECTIVE_SHARE[league];
  const subjective = total * share;
  return {
    subjective,
    administrative: total - subjective,
  };
}

function isCrisisLeverageContext(input: PenaltyLeverageWeightInput): boolean {
  const timeRemaining = input.gameSecondsRemaining;
  const scoreDiff = input.scoreDifferential;
  return (
    timeRemaining !== undefined &&
    timeRemaining < 120 &&
    scoreDiff !== undefined &&
    Math.abs(scoreDiff) < 8
  );
}

function isPressureDownContext(down?: number): boolean {
  return down === 3 || down === 4;
}

/**
 * Contextual leverage multiplier for LWIS:
 * - 2.0× when time remaining < 120s and score differential < 8
 * - 1.5× on 3rd/4th down
 * - 1.0× otherwise
 */
export function computeContextualLeverageMultiplier(
  input: PenaltyLeverageWeightInput,
): number {
  if (isCrisisLeverageContext(input)) {
    return LWIS_LEVERAGE_MULTIPLIER.crisis;
  }
  if (isPressureDownContext(input.down)) {
    return LWIS_LEVERAGE_MULTIPLIER.pressure;
  }
  return LWIS_LEVERAGE_MULTIPLIER.base;
}

/** @deprecated Use computeContextualLeverageMultiplier — retained for legacy imports. */
export function computePenaltyLeverageWeight(
  input: PenaltyLeverageWeightInput,
): number {
  return computeContextualLeverageMultiplier(input);
}

/** Absolute |ΔWPA| component before leverage weighting. */
export function estimateWpaMovement(input: PenaltyLeverageWeightInput): number {
  if (input.wpaDelta !== undefined) {
    return Math.round(Math.abs(input.wpaDelta) * 10000) / 10000;
  }
  return LWIS_MAX_WPA_PROXY * 0.3125;
}

/** Full leverage metadata for a single whistle event. */
export function buildPenaltyLeverageWeight(
  input: PenaltyLeverageWeightInput,
): PenaltyLeverageWeight {
  const leverage_weight = computeContextualLeverageMultiplier(input);
  return {
    leverage_weight,
    wpa_proxy: estimateWpaMovement(input),
  };
}

/** Shared subjective vs administrative taxonomy used by scouting and disposition audits. */
export const FOUL_CLASSIFICATION_MAP = {
  subjective: SUBJECTIVE_PENALTY_CODES,
  administrative: ADMINISTRATIVE_PENALTY_CODES,
  defaultSubjectiveShare: LEAGUE_DEFAULT_SUBJECTIVE_SHARE,
} as const;
