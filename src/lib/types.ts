export type RefRole = "crew_chief" | "referee" | "umpire" | "alternate";

export interface RefOfficial {
  name: string;
  number: number;
  role: RefRole;
}

export interface AssignmentGame {
  id: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  league: "NBA" | "WNBA";
  crew: RefOfficial[];
}

export interface AssignmentsFile {
  lastUpdated: string;
  date: string;
  source: "official.nba.com" | "seeded";
  games: AssignmentGame[];
}

export interface RefGameRecord {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  totalPoints: number;
  totalFouls: number;
  overHit: boolean;
  raptorsInvolved: boolean;
}

/** Per-ref stats for games involving a specific team. */
export interface RefTeamStat {
  games: number;
  avgFoulDifferential: number;
  avgTotalPoints: number;
  overRate: number;
  winRate: number;
}

export interface RefProfile {
  slug: string;
  name: string;
  number: number;
  games: number;
  avgTotalPoints: number;
  overRate: number;
  avgFouls: number;
  homeCoverRate: number | null;
  totalPointsDelta: number;
  foulsDelta: number;
  seasons: string[];
  recentGames: RefGameRecord[];
  /** Keyed by team abbreviation (e.g. LAL, TOR). */
  teamStats?: Record<string, RefTeamStat>;
}

export interface TeamCrewSplit {
  crewKey: string;
  crewNames: string[];
  games: number;
  avgTotalPoints: number;
  overRate: number;
  avgFouls: number;
  wins: number;
  losses: number;
  totalDelta: number;
  homeGames: number;
  awayGames: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  avgTeamFouls: number;
  avgOpponentFouls: number;
  foulDifferential: number;
}

export type WhistleBias = "team" | "opponent" | "neutral";

export interface RefStatsFile {
  meta: {
    lastUpdated: string;
    seasons: string[];
    leagueAvgTotal: number;
    leagueAvgFouls: number;
    leagueOverBaseline: number;
    minSampleSize: number;
    source: "nba-stats-api" | "seeded";
    atsAvailable: boolean;
    refCount?: number;
    totalGamesProcessed?: number;
    dateRange?: { earliest: string; latest: string };
    note?: string;
  };
  refs: RefProfile[];
  teamSplits: Record<string, TeamCrewSplit[]>;
  /** @deprecated Migrated to teamSplits.TOR on read */
  raptorsSplits?: TeamCrewSplit[];
  /** @deprecated Migrated to teamSplits.LAL on read */
  lakersSplits?: TeamCrewSplit[];
}

export type OuLean = "over" | "under" | "neutral";

/** Sportsbook total for a game (optional — from The Odds API or manual). */
export interface GameOddsLine {
  gameId?: string;
  awayTeam: string;
  homeTeam: string;
  total: number;
  /** e.g. draftkings, fanduel, consensus */
  source: string;
  lastUpdated: string;
}

export interface OddsFile {
  lastUpdated: string;
  source: "the-odds-api" | "benchmark" | "seeded";
  note?: string;
  lines: GameOddsLine[];
}

export type PaceAlertKind = "high_pace" | "low_pace";

export type SampleQuality = "strong" | "moderate" | "weak";

/** Crew scoring/foul premium vs league baseline for tonight's assignment. */
export interface CrewWhistlePremium {
  gameId: string;
  matchup: string;
  scoringPremium: number;
  foulPremium: number;
  avgTotalPoints: number;
  avgFouls: number;
  /** Historical crew avg minus benchmark (odds total or 225 proxy). */
  gapVsBenchmark: number;
  benchmarkTotal: number;
  benchmarkSource: "sportsbook" | "league_proxy";
  teamAdjustedPremium: number | null;
  reunionPremium: number | null;
  reunionGames: number;
  sampleQuality: SampleQuality;
  qualifiedRefCount: number;
  alert: PaceAlertKind | null;
  alertReason: string | null;
}

export type HomeBiasKind = "home_protector" | "road_warrior" | "neutral";

/** Home vs away tendencies for a crew (not ATS — win/foul splits only). */
export interface CrewHomeBias {
  gameId: string;
  homeAbbr: string;
  homeLabel: string;
  kind: HomeBiasKind;
  homeWinRate: number | null;
  awayWinRate: number | null;
  homeFoulEdge: number | null;
  sampleGames: number;
  headline: string;
  summary: string;
}

export interface SlateAlertsFile {
  generatedAt: string;
  assignmentsDate: string;
  isPreview: boolean;
  paceAlerts: CrewWhistlePremium[];
  homeBiasSignals: CrewHomeBias[];
}
