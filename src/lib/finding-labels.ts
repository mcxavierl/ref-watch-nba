import type { FindingLeague } from "@/lib/findings-shared";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

export type FindingMetricLabels = {
  /** Whistle stat in plain language: fouls, minors, flags */
  whistle: string;
  /** Combined score unit plural: points, goals */
  score: string;
  /** O/U benchmark line label */
  overBenchmark: string;
  /** ATS / spread cover label */
  spreadCover: string;
  /** NHL OT/SO rate label */
  otRate?: string;
  /** Soccer bookings/cards label */
  bookings?: string;
};

const DATA_LEAGUE_TO_ID: Record<FindingLeague, LeagueId> = {
  NBA: "nba",
  NHL: "nhl",
  NFL: "nfl",
  EPL: "epl",
  LALIGA: "laliga",
  WNBA: "wnba",
  CBB: "cbb",
  CFB: "cfb",
};

const LEAGUE_OVERRIDES: Partial<
  Record<FindingLeague, Partial<FindingMetricLabels>>
> = {
  NHL: {
    whistle: "minors",
    score: "goals",
    overBenchmark: "goals",
    otRate: "OT/SO rate",
  },
  NBA: {
    whistle: "fouls",
    score: "points",
    overBenchmark: "points",
    spreadCover: "spread cover",
  },
  NFL: {
    whistle: "flags",
    score: "total points",
    overBenchmark: "points",
    spreadCover: "spread cover",
  },
  EPL: {
    whistle: "fouls",
    score: "total goals",
    overBenchmark: "goals",
    bookings: "bookings/cards",
    spreadCover: "spread cover",
  },
  LALIGA: {
    whistle: "fouls",
    score: "total goals",
    overBenchmark: "goals",
    bookings: "bookings/cards",
    spreadCover: "spread cover",
  },
  CBB: {
    whistle: "fouls",
    score: "points",
    overBenchmark: "points",
    spreadCover: "spread cover",
  },
  CFB: {
    whistle: "flags",
    score: "total points",
    overBenchmark: "points",
    spreadCover: "spread cover",
  },
};

/** League-aware metric sub-labels for finding stat rows and copy. */
export function findingMetricLabels(league: FindingLeague): FindingMetricLabels {
  const leagueId = DATA_LEAGUE_TO_ID[league];
  const config = LEAGUES[leagueId];
  const overrides = LEAGUE_OVERRIDES[league] ?? {};
  const metrics = config.metrics;

  return {
    whistle: overrides.whistle ?? metrics.whistleShort.toLowerCase(),
    score: overrides.score ?? metrics.scoreUnitPlural,
    overBenchmark: overrides.overBenchmark ?? metrics.scoreUnitPlural,
    spreadCover: overrides.spreadCover ?? "spread cover",
    otRate: overrides.otRate,
    bookings: overrides.bookings,
  };
}
