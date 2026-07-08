export type StatsQueryLocation = "home" | "away" | "any";

export type StatsQueryContext = "back_to_back" | "rest_advantage";

/** User-facing tier labels; maps to `top10` | `mid10` | `bottom10` in SOS module. */
export type StatsQueryOpponentTier = "top10" | "mid" | "bottom10";

export interface StatsQueryDateRange {
  start: string;
  end: string;
}

export interface StatsQuery {
  ref: string | null;
  team: string | null;
  opponent: string | null;
  location: StatsQueryLocation;
  season: string | string[] | null;
  date_range: StatsQueryDateRange | null;
  context: StatsQueryContext | null;
  opponent_tier: StatsQueryOpponentTier | null;
}

export type StatsSampleFlag = "sufficient" | "small" | "insufficient";

export interface StatsQueryResult {
  wins: number;
  losses: number;
  n: number;
  win_pct: number;
  wilson_ci_low: number;
  wilson_ci_high: number;
  sample_flag: StatsSampleFlag;
  /** Resolved canonical values used for the query (for logging / disclosure). */
  resolved: {
    ref_slug: string | null;
    ref_name: string | null;
    team: string;
    opponent: string | null;
  };
}

/** Minimum games before we treat a ref×team slice as analytically sufficient. */
export const MIN_REF_SAMPLE = 30;

/** Below this count the agent must refuse to editorialize on direction. */
export const INSUFFICIENT_SAMPLE_THRESHOLD = 10;

export function defaultStatsQuery(): StatsQuery {
  return {
    ref: null,
    team: "OKC",
    opponent: null,
    location: "any",
    season: null,
    date_range: null,
    context: null,
    opponent_tier: null,
  };
}

export function normalizeStatsQuery(raw: Partial<StatsQuery>): StatsQuery {
  const base = defaultStatsQuery();
  return {
    ref: raw.ref ?? base.ref,
    team: raw.team ?? base.team,
    opponent: raw.opponent ?? base.opponent,
    location: raw.location ?? base.location,
    season: raw.season ?? base.season,
    date_range: raw.date_range ?? base.date_range,
    context: raw.context ?? base.context,
    opponent_tier: raw.opponent_tier ?? base.opponent_tier,
  };
}

export function sampleFlagForN(n: number): StatsSampleFlag {
  if (n < INSUFFICIENT_SAMPLE_THRESHOLD) return "insufficient";
  if (n < MIN_REF_SAMPLE) return "small";
  return "sufficient";
}

const SEASON_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateStatsQuery(query: StatsQuery): string[] {
  const errors: string[] = [];

  if (
    query.location !== "home" &&
    query.location !== "away" &&
    query.location !== "any"
  ) {
    errors.push(`Invalid location: ${String(query.location)}`);
  }

  if (query.season !== null) {
    const seasons = Array.isArray(query.season) ? query.season : [query.season];
    for (const s of seasons) {
      if (!SEASON_RE.test(s)) errors.push(`Invalid season label: ${s}`);
    }
  }

  if (query.date_range) {
    if (!DATE_RE.test(query.date_range.start)) {
      errors.push(`Invalid date_range.start: ${query.date_range.start}`);
    }
    if (!DATE_RE.test(query.date_range.end)) {
      errors.push(`Invalid date_range.end: ${query.date_range.end}`);
    }
    if (
      DATE_RE.test(query.date_range.start) &&
      DATE_RE.test(query.date_range.end) &&
      query.date_range.start > query.date_range.end
    ) {
      errors.push("date_range.start must be on or before date_range.end");
    }
  }

  if (
    query.context !== null &&
    query.context !== "back_to_back" &&
    query.context !== "rest_advantage"
  ) {
    errors.push(`Invalid context: ${String(query.context)}`);
  }

  if (
    query.opponent_tier !== null &&
    query.opponent_tier !== "top10" &&
    query.opponent_tier !== "mid" &&
    query.opponent_tier !== "bottom10"
  ) {
    errors.push(`Invalid opponent_tier: ${String(query.opponent_tier)}`);
  }

  return errors;
}

/** JSON Schema for LLM tool `query_stats` parameters. */
export const STATS_QUERY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ref: {
      type: ["string", "null"],
      description:
        "Referee name (fuzzy-matched to canonical NBA list). Null if question is team-only.",
    },
    team: {
      type: ["string", "null"],
      description: "Team abbr or name. Defaults to OKC (Thunder) when null.",
    },
    opponent: {
      type: ["string", "null"],
      description: "Opponent team abbr or name, or null for any opponent.",
    },
    location: {
      type: "string",
      enum: ["home", "away", "any"],
      description: "Whether the focal team played at home, away, or either.",
    },
    season: {
      oneOf: [
        { type: "null" },
        { type: "string", pattern: "^\\d{4}-\\d{2}$" },
        {
          type: "array",
          items: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
        },
      ],
      description:
        'Season label(s) e.g. "2023-24" or ["2021-22","2022-23"]. Null = all seasons in sample.',
    },
    date_range: {
      oneOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            start: { type: "string", format: "date" },
            end: { type: "string", format: "date" },
          },
          required: ["start", "end"],
        },
      ],
    },
    context: {
      type: ["string", "null"],
      enum: ["back_to_back", "rest_advantage", null],
      description:
        "back_to_back = focal team on second night of B2B; rest_advantage = focal team had more rest than opponent.",
    },
    opponent_tier: {
      type: ["string", "null"],
      enum: ["top10", "mid", "bottom10", null],
      description:
        "Filter by opponent season-end tier (top10 / mid / bottom10 by league win%).",
    },
  },
  required: [
    "ref",
    "team",
    "opponent",
    "location",
    "season",
    "date_range",
    "context",
    "opponent_tier",
  ],
} as const;
