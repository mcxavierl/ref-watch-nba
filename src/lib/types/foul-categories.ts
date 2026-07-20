/**
 * Shared foul taxonomy: separates objective administrative whistles from
 * subjective judgment calls. Import this map from ingest pipelines and
 * analytics code as the single source of truth.
 */
export enum FoulCategory {
  ADMIN = "ADMIN",
  SUBJECTIVE = "SUBJECTIVE",
}

/** Leagues covered by {@link FOUL_CLASSIFICATION_MAP}. */
export type FoulClassificationLeague = "nba" | "nfl";

const NBA_FOUL_CLASSIFICATIONS = {
  "Delay of Game": FoulCategory.ADMIN,
  "Shot Clock Violation": FoulCategory.ADMIN,
  "Eight Second Violation": FoulCategory.ADMIN,
  "Five Second Violation": FoulCategory.ADMIN,
  "Backcourt Violation": FoulCategory.ADMIN,
  "Kicked Ball Violation": FoulCategory.ADMIN,
  "Lane Violation": FoulCategory.ADMIN,
  "Defensive Three Seconds": FoulCategory.ADMIN,
  "Too Many Players": FoulCategory.ADMIN,
  "Jump Ball Violation": FoulCategory.ADMIN,
  "Excess Timeout": FoulCategory.ADMIN,
  "Illegal Defense": FoulCategory.ADMIN,
  "Personal Foul": FoulCategory.SUBJECTIVE,
  "Shooting Foul": FoulCategory.SUBJECTIVE,
  "Offensive Foul": FoulCategory.SUBJECTIVE,
  "Charging Foul": FoulCategory.SUBJECTIVE,
  "Blocking Foul": FoulCategory.SUBJECTIVE,
  "Loose Ball Foul": FoulCategory.SUBJECTIVE,
  "Reach-In Foul": FoulCategory.SUBJECTIVE,
  "Technical Foul": FoulCategory.SUBJECTIVE,
  "Flagrant Foul Type 1": FoulCategory.SUBJECTIVE,
  "Flagrant Foul Type 2": FoulCategory.SUBJECTIVE,
  "Clear Path Foul": FoulCategory.SUBJECTIVE,
  "Away From Play Foul": FoulCategory.SUBJECTIVE,
  "Take Foul": FoulCategory.SUBJECTIVE,
  "Illegal Screen": FoulCategory.SUBJECTIVE,
  "Hand Check": FoulCategory.SUBJECTIVE,
} as const satisfies Record<string, FoulCategory>;

const NFL_FOUL_CLASSIFICATIONS = {
  "False Start": FoulCategory.ADMIN,
  "Delay of Game": FoulCategory.ADMIN,
  "Illegal Formation": FoulCategory.ADMIN,
  "Neutral Zone Infraction": FoulCategory.ADMIN,
  "Illegal Shift": FoulCategory.ADMIN,
  "Illegal Motion": FoulCategory.ADMIN,
  "Illegal Substitution": FoulCategory.ADMIN,
  "Too Many Men on Field": FoulCategory.ADMIN,
  Encroachment: FoulCategory.ADMIN,
  "Illegal Snap": FoulCategory.ADMIN,
  "Ineligible Downfield": FoulCategory.ADMIN,
  "Intentional Grounding": FoulCategory.ADMIN,
  "Offside on Free Kick": FoulCategory.ADMIN,
  "Defensive Holding": FoulCategory.SUBJECTIVE,
  "Offensive Holding": FoulCategory.SUBJECTIVE,
  "Pass Interference": FoulCategory.SUBJECTIVE,
  "Defensive Pass Interference": FoulCategory.SUBJECTIVE,
  "Offensive Pass Interference": FoulCategory.SUBJECTIVE,
  "Roughing the Passer": FoulCategory.SUBJECTIVE,
  "Block in the Back": FoulCategory.SUBJECTIVE,
  "Unnecessary Roughness": FoulCategory.SUBJECTIVE,
  "Unsportsmanlike Conduct": FoulCategory.SUBJECTIVE,
  "Face Mask": FoulCategory.SUBJECTIVE,
  "Illegal Contact": FoulCategory.SUBJECTIVE,
  "Horse Collar Tackle": FoulCategory.SUBJECTIVE,
  "Personal Foul": FoulCategory.SUBJECTIVE,
  Targeting: FoulCategory.SUBJECTIVE,
  "Running Into the Kicker": FoulCategory.SUBJECTIVE,
} as const satisfies Record<string, FoulCategory>;

/** Canonical foul-name to category map for NBA and NFL ingest feeds. */
export const FOUL_CLASSIFICATION_MAP = {
  nba: NBA_FOUL_CLASSIFICATIONS,
  nfl: NFL_FOUL_CLASSIFICATIONS,
} as const satisfies Record<
  FoulClassificationLeague,
  Record<string, FoulCategory>
>;

export type NbaFoulName = keyof typeof NBA_FOUL_CLASSIFICATIONS;
export type NflFoulName = keyof typeof NFL_FOUL_CLASSIFICATIONS;
export type FoulClassificationMap = typeof FOUL_CLASSIFICATION_MAP;
export type FoulClassificationName = NbaFoulName | NflFoulName;

/** Normalize feed labels (display text or snake_case slugs) for lookup. */
export function normalizeFoulName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const titled = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

  return titled;
}

function normalizeFoulSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const NBA_SLUG_ALIASES: Record<string, NbaFoulName> = {
  delay_of_game: "Delay of Game",
  delay: "Delay of Game",
  shot_clock_violation: "Shot Clock Violation",
  eight_second_violation: "Eight Second Violation",
  five_second_violation: "Five Second Violation",
  backcourt: "Backcourt Violation",
  kicked_ball_violation: "Kicked Ball Violation",
  kicked_ball: "Kicked Ball Violation",
  lane_violation: "Lane Violation",
  defensive_three_seconds: "Defensive Three Seconds",
  three_in_key: "Defensive Three Seconds",
  too_many_players: "Too Many Players",
  too_many_men: "Too Many Players",
  jump_ball_violation: "Jump Ball Violation",
  excess_timeout: "Excess Timeout",
  illegal_defense: "Illegal Defense",
  personal_foul: "Personal Foul",
  shooting_foul: "Shooting Foul",
  offensive_foul: "Offensive Foul",
  charging: "Charging Foul",
  blocking: "Blocking Foul",
  loose_ball_foul: "Loose Ball Foul",
  reach_in: "Reach-In Foul",
  technical_foul: "Technical Foul",
  flagrant: "Flagrant Foul Type 1",
  flagrant_1: "Flagrant Foul Type 1",
  flagrant_2: "Flagrant Foul Type 2",
  clear_path: "Clear Path Foul",
  away_from_play: "Away From Play Foul",
  take_foul: "Take Foul",
  illegal_screen: "Illegal Screen",
  hand_check: "Hand Check",
};

const NFL_SLUG_ALIASES: Record<string, NflFoulName> = {
  false_start: "False Start",
  delay_of_game: "Delay of Game",
  illegal_formation: "Illegal Formation",
  neutral_zone_infraction: "Neutral Zone Infraction",
  neutral_zone: "Neutral Zone Infraction",
  illegal_shift: "Illegal Shift",
  illegal_motion: "Illegal Motion",
  illegal_substitution: "Illegal Substitution",
  too_many_men: "Too Many Men on Field",
  too_many_men_on_field: "Too Many Men on Field",
  encroachment: "Encroachment",
  illegal_snap: "Illegal Snap",
  ineligible_downfield: "Ineligible Downfield",
  intentional_grounding: "Intentional Grounding",
  offside_on_free_kick: "Offside on Free Kick",
  defensive_holding: "Defensive Holding",
  offensive_holding: "Offensive Holding",
  holding: "Defensive Holding",
  pass_interference: "Pass Interference",
  defensive_pass_interference: "Defensive Pass Interference",
  offensive_pass_interference: "Offensive Pass Interference",
  dpi: "Defensive Pass Interference",
  opi: "Offensive Pass Interference",
  roughing_the_passer: "Roughing the Passer",
  roughing_passer: "Roughing the Passer",
  roughing: "Roughing the Passer",
  block_in_the_back: "Block in the Back",
  unnecessary_roughness: "Unnecessary Roughness",
  unsportsmanlike_conduct: "Unsportsmanlike Conduct",
  face_mask: "Face Mask",
  illegal_contact: "Illegal Contact",
  horse_collar: "Horse Collar Tackle",
  horse_collar_tackle: "Horse Collar Tackle",
  personal_foul: "Personal Foul",
  targeting: "Targeting",
  running_into_the_kicker: "Running Into the Kicker",
};

function resolveCanonicalFoulName<L extends FoulClassificationLeague>(
  league: L,
  rawName: string,
): keyof FoulClassificationMap[L] | null {
  const leagueMap = FOUL_CLASSIFICATION_MAP[league];
  if (rawName in leagueMap) {
    return rawName as keyof FoulClassificationMap[L];
  }

  const titled = normalizeFoulName(rawName);
  if (titled in leagueMap) {
    return titled as keyof FoulClassificationMap[L];
  }

  const slug = normalizeFoulSlug(rawName);
  const aliases = league === "nba" ? NBA_SLUG_ALIASES : NFL_SLUG_ALIASES;
  const canonical = aliases[slug];
  if (canonical && canonical in leagueMap) {
    return canonical as keyof FoulClassificationMap[L];
  }

  return null;
}

/** Look up a foul category from a feed label or slug. Defaults to SUBJECTIVE. */
export function classifyFoulName(
  league: FoulClassificationLeague,
  rawName: string,
): FoulCategory {
  const canonical = resolveCanonicalFoulName(league, rawName);
  if (!canonical) return FoulCategory.SUBJECTIVE;
  return FOUL_CLASSIFICATION_MAP[league][canonical];
}

/** Strict lookup: returns undefined when the foul name is not in the taxonomy map. */
export function getFoulCategory(
  league: FoulClassificationLeague,
  rawName: string,
): FoulCategory | undefined {
  const canonical = resolveCanonicalFoulName(league, rawName);
  if (!canonical) return undefined;
  return FOUL_CLASSIFICATION_MAP[league][canonical];
}

export function isAdministrativeFoul(
  league: FoulClassificationLeague,
  rawName: string,
): boolean {
  return classifyFoulName(league, rawName) === FoulCategory.ADMIN;
}

export function isSubjectiveFoul(
  league: FoulClassificationLeague,
  rawName: string,
): boolean {
  return classifyFoulName(league, rawName) === FoulCategory.SUBJECTIVE;
}
