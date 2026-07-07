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
