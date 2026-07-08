export type RefRole =
  | "crew_chief"
  | "referee"
  | "umpire"
  | "alternate"
  | "linesman"
  | "side_judge"
  | "field_judge"
  | "back_judge"
  | "line_judge"
  | "down_judge";

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
  league: "NBA" | "WNBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";
  crew: RefOfficial[];
}

export interface AssignmentsFile {
  lastUpdated: string;
  date: string;
  source: "official.nba.com" | "api-web.nhle.com" | "espn" | "seeded" | "historical";
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
  /** NHL: 2-minute minors assessed per team. */
  homeMinors?: number;
  awayMinors?: number;
  homeFlags?: number;
  awayFlags?: number;
  homePenaltyYards?: number;
  awayPenaltyYards?: number;
  totalPenaltyYards?: number;
  wentToOvertime?: boolean;
  closingTotal?: number;
  /** Home puck line; negative = home favorite. */
  homeSpread?: number;
}

/** NHL-only referee analytics (minors, OT, penalty balance). */
export interface NhlRefAnalytics {
  avgMinorsPerGame: number;
  minorsDelta: number;
  overtimeRate: number;
  overtimeGames: number;
  /** Average |home minors − away minors| per game. */
  avgMinorImbalance: number;
  /** Share of games within ±1 minor between teams. */
  balancedGameRate: number;
  balanceKind: "balancer" | "asymmetric" | "neutral";
  provenance?: {
    avgMinorsPerGame: MetricProvenance;
    overtimeRate: MetricProvenance;
    penaltyBalance: MetricProvenance;
    minorsBaseline: MetricProvenance;
    sampleGate: SampleGateStatus;
  };
}


export interface NflRefAnalytics { avgFlagsPerGame:number; flagsDelta:number; avgPenaltyYardsPerGame:number; penaltyYardsDelta:number; avgFlagImbalance:number; balancedGameRate:number; balanceKind:"balancer"|"asymmetric"|"neutral"; provenance?:{avgFlagsPerGame:MetricProvenance;penaltyYards:MetricProvenance;penaltyBalance:MetricProvenance;flagsBaseline:MetricProvenance;sampleGate:SampleGateStatus;};}
export type CfbRefAnalytics = NflRefAnalytics;

/** EPL referee analytics (goals, fouls, cards, penalties). */
export interface EplRefAnalytics {
  avgGoalsPerGame: number;
  goalsDelta: number;
  avgFoulsPerGame: number;
  foulsDelta: number;
  avgYellowCardsPerGame: number;
  yellowCardsDelta: number;
  avgRedCardsPerGame: number;
  redCardsDelta: number;
  avgPenaltiesPerGame: number;
  penaltiesDelta: number;
  avgCardImbalance: number;
  balancedGameRate: number;
  balanceKind: "balancer" | "asymmetric" | "neutral";
  provenance?: {
    avgFoulsPerGame: MetricProvenance;
    avgYellowCardsPerGame: MetricProvenance;
    avgRedCardsPerGame: MetricProvenance;
    avgPenaltiesPerGame: MetricProvenance;
    cardBalance: MetricProvenance;
    foulsBaseline: MetricProvenance;
    sampleGate: SampleGateStatus;
  };
}
export interface NhlTeamSpecialTeams {
  ppPct: number;
  pkPct: number;
}

/** Pre-game PP Premium signal for tonight's slate. */
export interface NhlPpPremiumSignal {
  gameId: string;
  matchup: string;
  index: number;
  refMinorRate: number;
  specialTeamsEdge: number;
  sampleGames: number;
  headline: string;
  summary: string;
  provenance?: {
    index: MetricProvenance;
    refMinorRate: MetricProvenance;
    specialTeamsEdge: MetricProvenance;
    sampleGate: SampleGateStatus;
    minorsBaseline: MetricProvenance;
  };
}

/** OT rate flag for tight matchups. */
export interface NhlOtRateSignal {
  gameId: string;
  matchup: string;
  refereeOtRate: number;
  leagueOtRate: number;
  homeSpread: number | null;
  sampleGames: number;
  headline: string;
  summary: string;
  provenance?: {
    refereeOtRate: MetricProvenance;
    sampleGate: SampleGateStatus;
  };
}

/** Per-ref stats for games involving a specific team. */
export interface RefTeamStat {
  games: number;
  avgFoulDifferential: number;
  avgTotalPoints: number;
  overRate: number;
  winRate: number;
  /** Exact W-L when sourced from Basketball-Reference or game logs. */
  wins?: number;
  losses?: number;
}

export interface RefProfile {
  slug: string;
  name: string;
  number: number;
  /** NHL roster role when known (referee vs linesman). */
  role?: RefRole;
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
  /** ATS, O/U buckets, home scoring splits when closing lines are available. */
  bettingStats?: RefBettingStats;
  /** NHL referee-only analytics when available. */
  nhlAnalytics?: NhlRefAnalytics;
  nflAnalytics?: NflRefAnalytics;
  cfbAnalytics?: CfbRefAnalytics;
  eplAnalytics?: EplRefAnalytics;
  provenance?: {
    avgTotalPoints: MetricProvenance;
    overRate: MetricProvenance;
    avgFouls: MetricProvenance;
    sampleGate: SampleGateStatus;
    leagueBaseline: MetricProvenance;
  };
}

export interface WlpRecord {
  wins: number;
  losses: number;
  pushes: number;
}

export interface OuBucketStat {
  label: string;
  record: WlpRecord;
}

export interface SpreadBucketStat {
  label: string;
  homeFavorite: WlpRecord;
  homeUnderdog: WlpRecord;
}

export interface RefBettingStats {
  homeTeamRecord: WlpRecord;
  homeTeamAts: WlpRecord;
  avgHomeScore: number;
  avgRoadScore: number;
  avgHomeMargin: number;
  overUnder: {
    overall: WlpRecord;
    buckets: OuBucketStat[];
  };
  spreadBuckets: SpreadBucketStat[];
  linesAvailable: boolean;
  provenance?: {
    aggregate: MetricProvenance;
    homeTeamAts: MetricProvenance;
    overUnder: MetricProvenance;
    spreadBuckets: MetricProvenance;
    lines: MetricProvenance;
    bucketGateThreshold: number;
  };
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
    source: "nba-stats-api" | "nhl-api" | "espn" | "seeded" | "historical" | "hybrid";
    /** When ref×team W-L is merged from Basketball-Reference. */
    refTeamWinLossSource?: "basketball-reference" | "pro-football-reference";
    atsAvailable: boolean;
    refCount?: number;
    totalGamesProcessed?: number;
    dateRange?: { earliest: string; latest: string };
    note?: string;
    /** NHL: league avg total minors per game (both teams). */
    leagueAvgMinors?: number;
    /** NHL: share of games reaching OT/SO. */
    leagueAvgPenaltyYards?: number;
    /** EPL: league avg yellow cards per match (both teams). */
    leagueAvgYellowCards?: number;
    /** EPL: league avg red cards per match (both teams). */
    leagueAvgRedCards?: number;
    /** EPL: league avg penalties awarded per match. */
    leagueAvgPenalties?: number;
    leagueOvertimeRate?: number;
    /** NHL: season PP/PK by team abbr. */
    teamSpecialTeams?: Record<string, NhlTeamSpecialTeams>;
  };
  refs: RefProfile[];
  teamSplits: Record<string, TeamCrewSplit[]>;
  /** @deprecated Migrated to teamSplits.TOR on read */
  raptorsSplits?: TeamCrewSplit[];
  /** @deprecated Migrated to teamSplits.LAL on read */
  lakersSplits?: TeamCrewSplit[];
}

export type OuLean = "over" | "under" | "neutral";

/** Sportsbook line for a game (optional, from The Odds API). */
export interface GameOddsLine {
  gameId?: string;
  awayTeam: string;
  homeTeam: string;
  total: number;
  /** Home spread; negative = home favorite. */
  homeSpread?: number;
  source: string;
  lastUpdated: string;
}

export interface OddsFile {
  lastUpdated: string;
  source: "the-odds-api" | "benchmark" | "seeded" | "nflverse" | "espn-pickcenter";
  note?: string;
  lines: GameOddsLine[];
}

export type PaceAlertKind = "high_pace" | "low_pace";

export type SampleQuality = "strong" | "moderate" | "weak";

/** How a displayed metric was derived. */
export type ProvenanceTag =
  | "computed-from-real"
  | "computed-with-partial-data"
  | "fallback-constant";

export interface MetricProvenance {
  tag: ProvenanceTag;
  sampleSize?: number;
  gateThreshold?: number;
  note?: string;
}

export interface SampleGateStatus {
  sampleSize: number;
  gateThreshold: number;
  cleared: boolean;
  label: string;
}

export interface ProvenanceBundle {
  aggregate: MetricProvenance;
  sampleGate: SampleGateStatus;
}

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
  provenance?: {
    scoringPremium: MetricProvenance;
    gapVsBenchmark: MetricProvenance;
    alert: MetricProvenance;
    benchmark: MetricProvenance;
    sampleGate: SampleGateStatus;
  };
}

export type HomeBiasKind = "home_protector" | "road_warrior" | "neutral";

/** Home vs away tendencies for a crew (not ATS, win/foul splits only). */
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
  provenance?: ProvenanceBundle;
}

export interface SlateAlertsFile {
  generatedAt: string;
  assignmentsDate: string;
  isPreview: boolean;
  paceAlerts: CrewWhistlePremium[];
  homeBiasSignals: CrewHomeBias[];
}
