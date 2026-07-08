/**
 * MLB schema blueprint — honest-data layout for plate-umpire-centric analytics.
 * Pitch-level zone metrics are gated behind `pitchTrackingAvailable`.
 * Run-line / O-U modules require `runLineAvailable`.
 */

/** Provenance tag for MLB dataset layers. */
export type MlbDataSource = "mlb-stats-api" | "espn" | "statcast" | "seeded";

/** Umpire role within a 4-man crew. */
export type MlbUmpireRole =
  | "home_plate"
  | "first_base"
  | "second_base"
  | "third_base";

/** Raw official from schedule / boxscore feed. */
export interface MlbOfficial {
  id: string;
  fullName: string;
  role: MlbUmpireRole;
}

/** Pitch-tracking metrics — only populated when Statcast verification succeeds. */
export interface MlbPitchTrackingMetrics {
  zoneAccuracy: number;
  consistencyScore: number;
  totalPitchesCalled: number;
}

/** Run-environment impact for home-plate umpire (boxscore-derived). */
export interface MlbRunImpactMetrics {
  runImpactValue: number;
  avgTotalRuns: number;
  avgGameDurationMinutes?: number;
}

/** Per-team record when a specific HP umpire worked that team's games. */
export interface MlbUmpireTeamStat {
  teamAbbr: string;
  games: number;
  wins: number;
  losses: number;
  avgTotalRuns: number;
  overRate?: number;
}

/** Single game log row — plate umpire is the indexing anchor. */
export interface MlbGameLogEntry {
  gamePk: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalRuns: number;
  homePlateUmpireId: string;
  homePlateUmpireName: string;
  crew: MlbOfficial[];
  gameDurationMinutes?: number;
  /** Statcast pitch rows attached when verified; absent otherwise. */
  pitchTracking?: MlbPitchTrackingMetrics;
}

/** UI-safe umpire profile with explicit module gates. */
export interface MlbUmpireProfile {
  id: string;
  slug: string;
  fullName: string;
  games: number;
  seasons: string[];
  /** Primary anchor — separates HP work from base rotation. */
  homePlateUmpireId: string;
  teamStats: Record<string, MlbUmpireTeamStat>;
  runImpact?: MlbRunImpactMetrics;
  /** Present only when Statcast backfill succeeded for this umpire. */
  pitchTracking?: MlbPitchTrackingMetrics;
}

/** Top-level stats file meta — mirrors NFL `atsAvailable` honesty pattern. */
export interface MlbStatsMeta {
  lastUpdated: string;
  source: MlbDataSource;
  seasons: string[];
  leagueAvgRuns: number;
  leagueOverBaseline: number;
  minSampleSize: number;
  refCount: number;
  totalGamesProcessed: number;
  dateRange?: { earliest: string; latest: string };
  /** True only when Statcast pitch-level verification is wired and populated. */
  pitchTrackingAvailable: boolean;
  /** True only when verified run lines (+/- 1.5) are present — analogous to `atsAvailable`. */
  runLineAvailable: boolean;
  note?: string;
}

export interface MlbStatsFile {
  meta: MlbStatsMeta;
  umpires: MlbUmpireProfile[];
}

/** Tonight's slate assignment — HP umpire highlighted. */
export interface MlbAssignmentGame {
  gamePk: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  homePlateUmpireId: string;
  homePlateUmpireName: string;
  crew: MlbOfficial[];
}

export interface MlbAssignmentsFile {
  lastUpdated: string;
  date: string;
  source: MlbDataSource;
  games: MlbAssignmentGame[];
  note?: string;
}

/**
 * Strip UI payload modules that lack verified backing data.
 * Call before writing public JSON or rendering components.
 */
export function sanitizeMlbUmpireForUi(
  profile: MlbUmpireProfile,
  meta: MlbStatsMeta,
): MlbUmpireProfile {
  const out: MlbUmpireProfile = {
    ...profile,
    pitchTracking: undefined,
    teamStats: { ...profile.teamStats },
  };

  if (meta.pitchTrackingAvailable && profile.pitchTracking) {
    out.pitchTracking = profile.pitchTracking;
  }

  if (!meta.runLineAvailable) {
    for (const key of Object.keys(out.teamStats)) {
      const row = out.teamStats[key];
      if (row) {
        out.teamStats[key] = { ...row, overRate: undefined };
      }
    }
  }

  return out;
}

export function defaultMlbMeta(source: MlbDataSource = "seeded"): MlbStatsMeta {
  return {
    lastUpdated: new Date().toISOString(),
    source,
    seasons: [],
    leagueAvgRuns: 8.8,
    leagueOverBaseline: 8.5,
    minSampleSize: 30,
    refCount: 0,
    totalGamesProcessed: 0,
    pitchTrackingAvailable: false,
    runLineAvailable: false,
    note:
      "Preview scaffold — boxscore-only until MLB Stats API backfill and Statcast verification complete.",
  };
}
