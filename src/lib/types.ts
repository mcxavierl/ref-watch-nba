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
  league: "NBA" | "WNBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  crew: RefOfficial[];
}

export interface AssignmentsFile {
  lastUpdated: string;
  date: string;
  source: "official.nba.com" | "api-web.nhle.com" | "nhl-api" | "espn" | "seeded" | "historical";
  games: AssignmentGame[];
  /** Human-readable status when crews are not published yet (e.g. NFL preseason week). */
  note?: string;
  /** Matchups on the next slate date before crew assignments drop. */
  scheduledGames?: AssignmentGame[];
  nextSlateDate?: string;
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
  /** Sum of leverage-weighted penalty impact for this game when PBP events exist. */
  highLeverageImpact?: number;
  /** Share of flags classified high/critical leverage (0–1). */
  highLeverageFlagRate?: number;
  subjectiveFlags?: number;
  administrativeFlags?: number;
}

/** Normalized NFL penalty type slug. */
export type NflPenaltyTypeSlug =
  | "defensive_pass_interference"
  | "offensive_pass_interference"
  | "pass_interference"
  | "defensive_holding"
  | "offensive_holding"
  | "roughing_passer"
  | "false_start"
  | "illegal_formation"
  | "delay_of_game"
  | "unsportsmanlike_conduct"
  | "neutral_zone"
  | "illegal_contact"
  | "face_mask"
  | "other";

export type PenaltyLeverageTier = "routine" | "moderate" | "high" | "critical";

/** Situational leverage context for a single penalty flag. */
export interface PenaltyLeverageState {
  down?: number;
  distance?: number;
  /** Offense yard line 0–100 (nflverse yardline_100). */
  yardLine?: number;
  quarter?: number;
  gameSecondsRemaining?: number;
  scoreDifferential?: number;
  wpBefore?: number;
  wpaDelta?: number;
  tier: PenaltyLeverageTier;
}

export interface NflPenaltyEvent {
  type: NflPenaltyTypeSlug;
  rawType: string;
  team: string;
  yards: number;
  accepted: boolean;
  leverage: PenaltyLeverageState;
  leverageScore: number;
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


export interface NflRefAnalytics {
  avgFlagsPerGame: number;
  flagsDelta: number;
  avgPenaltyYardsPerGame: number;
  penaltyYardsDelta: number;
  avgFlagImbalance: number;
  balancedGameRate: number;
  balanceKind: "balancer" | "asymmetric" | "neutral";
  /** Leverage-weighted penalty impact per game (not raw flag count). */
  avgHighLeverageImpactPerGame?: number;
  highLeverageImpactDelta?: number;
  /** Share of flags that are high/critical leverage (0–1). */
  highLeverageFlagRate?: number;
  /** Games with play-level penalty events backing leverage metrics. */
  leverageSampleGames?: number;
  /** Judgment/subjective flags per game (contact, PI, holding, etc.). */
  avgSubjectiveFlagsPerGame?: number;
  subjectiveFlagsDelta?: number;
  /** Administrative/objective flags per game (delay, formation, false start). */
  avgAdministrativeFlagsPerGame?: number;
  administrativeFlagsDelta?: number;
  subjectiveFlagShare?: number;
  dispositionSampleGames?: number;
  dispositionEventBackedGames?: number;
  provenance?: {
    avgFlagsPerGame: MetricProvenance;
    penaltyYards: MetricProvenance;
    penaltyBalance: MetricProvenance;
    flagsBaseline: MetricProvenance;
    highLeverageImpact?: MetricProvenance;
    sampleGate: SampleGateStatus;
  };
}
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
  /** Team-minus-opponent technical fouls (NBA) or yellow cards (EPL) per game when available. */
  avgTechnicalFoulDifferential?: number;
  /** Exact W-L when sourced from Basketball-Reference or game logs. */
  wins?: number;
  losses?: number;
  /** ATS cover record when closing lines are available for ref×team games. */
  atsWins?: number;
  atsLosses?: number;
  atsPushes?: number;
  /** Lined games with an ATS decision (wins + losses + pushes). */
  atsGames?: number;
  atsCoverRate?: number;
  /** ATS cover when team was market underdog (positive spread as home, or away vs favorite). */
  underdogAtsCoverRate?: number;
  underdogAtsGames?: number;
  /** Signed deviation from 50% neutral market on lined ref×team games. */
  atsDeviationFromNeutral?: number;
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

/** Referee-level performance vs closing-line market expectation (ATS-first). */
export interface RefMarketExpectationStats {
  /** Lined games with ATS decision across all crews for this official. */
  linedGames: number;
  atsCovers: number;
  atsLosses: number;
  atsPushes: number;
  /** Team cover rate when this ref officiates (0–1). */
  coverRate: number;
  /** coverRate − 0.5 on lined games. */
  deviationFromNeutral: number;
  /** Games where the tracked team was market underdog. */
  underdogGames: number;
  underdogCoverRate: number;
  /** Underdog cover deviation vs 50% neutral. */
  underdogDeviationFromNeutral: number;
  /** True when deviation exceeds league outlier threshold with adequate sample. */
  isAtsOutlier: boolean;
  outlierDirection: "covers_more" | "covers_less" | null;
  /** Pearson-style correlation: underdog flag vs ATS cover on ref×team rows. */
  underdogCoverCorrelation: number | null;
  linesAvailable: boolean;
  provenance?: {
    aggregate: MetricProvenance;
    outlierGate: SampleGateStatus;
    correlation: MetricProvenance;
  };
}

/** Optional birthplace / hometown strings for regional context enrichment. */
export interface RefGeographyEntry {
  birthplace?: string;
  hometown?: string;
  /** ISO-style birth nation when known (e.g. "USA", "ESP"). */
  birthCountry?: string;
  /** FIFA confederation or macro-region (e.g. "uefa", "concacaf"). */
  region?: string;
}

export interface RefProfile {
  slug: string;
  name: string;
  number: number;
  /** Official birthplace when known (e.g. "Sacramento, California"). */
  birthplace?: string;
  /** Official hometown when birthplace is unavailable. */
  hometown?: string;
  /** Birth nation when known (e.g. "USA", "MEX"). */
  birthCountry?: string;
  /** FIFA confederation or macro-region for international analysis. */
  region?: string;
  /** Mean geopolitical distance from birth nation to officiated team origins (0–1). */
  originVariance?: number;
  /** NHL roster role when known (referee vs linesman). */
  role?: RefRole;
  games: number;
  avgTotalPoints: number;
  overRate: number;
  avgFouls: number;
  homeCoverRate: number | null;
  totalPointsDelta: number;
  foulsDelta: number;
  /** Game-State Neutralization Index (0-100). Undefined when high-leverage sample < 50 min. */
  referee_gsni?: number;
  /** Per-game weighted foul deviation spread. Undefined when GSNI is withheld. */
  referee_gsni_volatility?: number;
  /** High-leverage minutes backing GSNI (sample honesty). */
  gsniHighLeverageMinutes?: number;
  /** Games with GSNI-eligible observations for this official. */
  gsniSampleGames?: number;
  seasons: string[];
  recentGames: RefGameRecord[];
  /** Keyed by team abbreviation (e.g. LAL, TOR). */
  teamStats?: Record<string, RefTeamStat>;
  /** ATS, O/U buckets, home scoring splits when closing lines are available. */
  bettingStats?: RefBettingStats;
  /** Performance vs closing-line expectation (ATS-first, independent of straight-up W-L). */
  marketExpectation?: RefMarketExpectationStats;
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
  /** ATS cover splits when closing lines exist for this crew bucket. */
  atsWins?: number;
  atsLosses?: number;
  atsPushes?: number;
  atsGames?: number;
  atsCoverRate?: number;
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
    source:
      | "nba-stats-api"
      | "nhl-api"
      | "espn"
      | "football-data"
      | "seeded"
      | "historical"
      | "hybrid";
    /** Hard gate: only true when stats come from verified real-source ingest. */
    data_verified?: boolean;
    /** NCAA pipeline integrity gate (100% game + ref coverage). */
    ncaa_pipeline_verified?: boolean;
    /** NCAA pipeline coverage percentage (0-100). */
    ncaa_pipeline_coverage_pct?: number;
    /** Human-readable provenance label for UI and agent responses. */
    data_source?: string;
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
    /** NCAA: per-conference whistle/scoring baselines for context-adjusted analytics. */
    conferenceBaselines?: Record<
      string,
      {
        conference: string;
        games: number;
        avgTotalPoints: number;
        avgFouls: number;
        avgHomeFouls: number;
        avgAwayFouls: number;
        avgFlags: number;
        avgHomeFlags: number;
        avgAwayFlags: number;
        avgPenaltyYards: number;
        foulDifferentialVariance: number;
      }
    >;
  };
  refs: RefProfile[];
  /** Optional geography index keyed by ref slug (merged at ingest). */
  refGeography?: Record<string, RefGeographyEntry>;
  teamSplits: Record<string, TeamCrewSplit[]>;
  /** @deprecated Migrated to teamSplits.TOR on read */
  raptorsSplits?: TeamCrewSplit[];
  /** @deprecated Migrated to teamSplits.LAL on read */
  lakersSplits?: TeamCrewSplit[];
  /** Team ATS baselines keyed by abbr when matrix enrichment runs from game logs. */
  teamAtsBaselines?: Record<
    string,
    {
      atsWins: number;
      atsLosses: number;
      atsPushes: number;
      atsGames: number;
      atsCoverRate: number;
    }
  >;
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
  /** American price for the over side (totals market). */
  overOdds?: number;
  /** American price for the under side (totals market). */
  underOdds?: number;
  /** American price for the home spread side. */
  homeSpreadOdds?: number;
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
