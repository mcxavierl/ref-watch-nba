export type AutopsyRecordStatus = "PENDING" | "COMPLETED";

export type AutopsyRecord = {
  id: string;
  gameId: string;
  leagueId: string;
  officialSlugs: string[];
  homeTeam: string;
  awayTeam: string;
  season: string;
  actualFouls: number;
  expectedFouls: number;
  delta: number;
  rarityPercentile: number;
  attributionCrewPct: number;
  attributionStylePct: number;
  attributionGamestatePct: number;
  summaryText: string;
  status: AutopsyRecordStatus;
  createdAt: string;
};

export type RollingWindowKey = "last_25_games" | "last_50_games" | "current_season";

export type RollingWindowBaseline = {
  window: RollingWindowKey;
  sampleSize: number;
  meanFouls: number;
  stdDev: number;
  consistencyScore: number;
};

export type RecalibratedOfficialMetrics = {
  leagueId: string;
  slug: string;
  updatedAt: string;
  rollingWindows: RollingWindowBaseline[];
  consistencyScore: number;
  whistleDriftDeltaPct: number | null;
  teamHistoryTeamsUpdated: string[];
};

export type RecalibrateProfilesInput = {
  autopsy: AutopsyRecord;
};

export type RecalibrateProfilesResult = {
  officialsUpdated: string[];
  rollingMetricsWritten: number;
  teamHistoryRowsUpdated: number;
  invalidatedPaths: string[];
  latencyMs: number;
};
