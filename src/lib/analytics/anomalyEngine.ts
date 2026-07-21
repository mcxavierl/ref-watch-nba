import type { LeagueId } from "@/lib/leagues";
import type { AssignmentGame, RefGameRecord, RefProfile } from "@/lib/types";

export type AnomalyType =
  | "CREW_FOUL_DEVIATION"
  | "TEMPO_DEVIATION"
  | "LINE_MOVEMENT_DIVERGENCE"
  | "REPLAY_OUTLIER"
  | "TECHNICAL_RATE_SPIKE"
  | "HOME_AWAY_DEVIATION";

export type RollingWindow =
  | "last_25_games"
  | "last_50_games"
  | "current_season"
  | "career_baseline";

export type SeverityLevel = "INFO" | "HIGH" | "CRITICAL";

export const ROLLING_WINDOWS: RollingWindow[] = [
  "last_25_games",
  "last_50_games",
  "current_season",
  "career_baseline",
];

export const ANOMALY_Z_THRESHOLD = 2.5;
export const MIN_WINDOW_SAMPLE = 8;

const BANNED_PHRASES = [
  "wrong line",
  "biased",
  "fixing",
  "rigged",
  "corrupt",
  "cheat",
] as const;

export type RollingWindowStats = {
  window: RollingWindow;
  sampleSize: number;
  mean: number;
  stdDev: number;
  leagueMean: number;
  zScore: number | null;
};

export type AnomalyEngineInput = {
  leagueId: LeagueId;
  game: AssignmentGame;
  crewProfiles: RefProfile[];
  leagueAvgTotal: number;
  leagueAvgFouls: number;
  benchmarkTotal: number;
  lineLag: number;
  currentSeason?: string;
};

export type DetectedAnomaly = {
  id: string;
  gameId: string;
  leagueId: LeagueId;
  type: AnomalyType;
  severityScore: number;
  severityLevel: SeverityLevel;
  zScore: number;
  rollingWindowUsed: RollingWindow;
  evidence: Record<string, unknown>;
  summary: string;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function zScore(value: number, baseline: number, sigma: number): number | null {
  if (sigma <= 0) return null;
  return round2((value - baseline) / sigma);
}

export function selectRollingWindowGames(
  games: RefGameRecord[],
  window: RollingWindow,
  currentSeason?: string,
): RefGameRecord[] {
  switch (window) {
    case "last_25_games":
      return games.slice(-25);
    case "last_50_games":
      return games.slice(-50);
    case "current_season":
      if (!currentSeason) return games;
      return games.filter((game) => game.season === currentSeason);
    case "career_baseline":
      return games;
    default:
      return games;
  }
}

export function pickBestRollingWindow(
  games: RefGameRecord[],
  currentSeason?: string,
): { window: RollingWindow; games: RefGameRecord[] } {
  for (const window of ROLLING_WINDOWS) {
    const slice = selectRollingWindowGames(games, window, currentSeason);
    if (slice.length >= MIN_WINDOW_SAMPLE) {
      return { window, games: slice };
    }
  }
  const fallback = selectRollingWindowGames(games, "career_baseline", currentSeason);
  return { window: "career_baseline", games: fallback };
}

function windowZScore(mean: number, leagueMean: number, sigma: number, sampleSize: number): number | null {
  if (sampleSize < 2) return null;
  const standardError = sigma / Math.sqrt(sampleSize);
  const denominator = Math.max(standardError, 0.35);
  return zScore(mean, leagueMean, denominator);
}

export function computeRollingWindowStats(
  games: RefGameRecord[],
  window: RollingWindow,
  leagueMean: number,
  currentSeason?: string,
): RollingWindowStats {
  const slice = selectRollingWindowGames(games, window, currentSeason);
  const values = slice.map((game) => game.totalFouls);
  const avg = mean(values);
  const sigma = stdDev(values, avg);
  return {
    window,
    sampleSize: slice.length,
    mean: round2(avg),
    stdDev: round2(sigma),
    leagueMean: round2(leagueMean),
    zScore: windowZScore(avg, leagueMean, sigma, slice.length),
  };
}

export function confidenceScore(sampleSize: number): number {
  return Math.min(1, sampleSize / 50);
}

export function computeSeverityScore(input: {
  crewDeviationZ: number;
  tempoDeviationZ: number;
  marketDivergenceZ: number;
  sampleSize: number;
}): number {
  const confidence = confidenceScore(input.sampleSize);
  const raw =
    Math.abs(input.crewDeviationZ) * 0.4 +
    Math.abs(input.tempoDeviationZ) * 0.3 +
    confidence * 0.2 +
    Math.abs(input.marketDivergenceZ) * 0.1;
  return Math.round(Math.min(100, Math.max(0, raw * 20)));
}

export function mapSeverityLevel(score: number): SeverityLevel {
  if (score >= 70) return "CRITICAL";
  if (score >= 40) return "HIGH";
  return "INFO";
}

export function assertObservationalCopy(text: string): string {
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      throw new Error(`Observational copy must not include "${phrase}"`);
    }
  }
  return text;
}

function crewPooledGames(profiles: RefProfile[]): RefGameRecord[] {
  const byId = new Map<string, RefGameRecord>();
  for (const profile of profiles) {
    for (const game of profile.recentGames ?? []) {
      byId.set(game.gameId, game);
    }
  }
  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function tempoWindowStats(
  games: RefGameRecord[],
  window: RollingWindow,
  leagueAvgTotal: number,
  currentSeason?: string,
): RollingWindowStats {
  const slice = selectRollingWindowGames(games, window, currentSeason);
  const values = slice.map((game) => game.totalPoints);
  const avg = mean(values);
  const sigma = stdDev(values, avg);
  return {
    window,
    sampleSize: slice.length,
    mean: round2(avg),
    stdDev: round2(sigma),
    leagueMean: round2(leagueAvgTotal),
    zScore: windowZScore(avg, leagueAvgTotal, sigma, slice.length),
  };
}

function homeAwayDeviationZ(games: RefGameRecord[]): number | null {
  if (games.length < MIN_WINDOW_SAMPLE) return null;
  const homeFouls: number[] = [];
  const awayFouls: number[] = [];
  for (const game of games) {
    homeFouls.push(game.homeFlags ?? game.totalFouls / 2);
    awayFouls.push(game.awayFlags ?? game.totalFouls / 2);
  }
  const homeMean = mean(homeFouls);
  const awayMean = mean(awayFouls);
  const spread = Math.abs(homeMean - awayMean);
  const sigma = stdDev([...homeFouls, ...awayFouls], mean([...homeFouls, ...awayFouls]));
  return zScore(spread, 0, sigma);
}

function replayOutlierZ(games: RefGameRecord[]): number | null {
  const rates = games
    .map((game) => game.highLeverageFlagRate)
    .filter((value): value is number => value !== undefined);
  if (rates.length < MIN_WINDOW_SAMPLE) return null;
  const avg = mean(rates);
  const sigma = stdDev(rates, avg);
  return zScore(avg, 0.15, sigma);
}

function technicalRateZ(games: RefGameRecord[]): number | null {
  const rates = games
    .map((game) => {
      const subjective = game.subjectiveFlags ?? 0;
      const admin = game.administrativeFlags ?? 0;
      if (subjective + admin === 0) return null;
      return subjective / Math.max(1, game.totalFouls);
    })
    .filter((value): value is number => value !== null);
  if (rates.length < MIN_WINDOW_SAMPLE) return null;
  const avg = mean(rates);
  const sigma = stdDev(rates, avg);
  return zScore(avg, 0.08, sigma);
}

function buildSummary(type: AnomalyType, z: number, window: RollingWindow): string {
  const magnitude = Math.abs(z).toFixed(1);
  const templates: Record<AnomalyType, string> = {
    CREW_FOUL_DEVIATION: `Historical officiating profile creates a statistically significant divergence from baseline expectation (${magnitude}σ vs ${window.replaceAll("_", " ")}).`,
    TEMPO_DEVIATION: `Assigned crew tempo profile diverges from league pacing baseline across the ${window.replaceAll("_", " ")} window (${magnitude}σ).`,
    LINE_MOVEMENT_DIVERGENCE: `Projected scoring pace sits outside the crew historical association band relative to market total (${magnitude}σ divergence).`,
    REPLAY_OUTLIER: `High-leverage stoppage rate in recent assignments exceeds the league replay-review baseline (${magnitude}σ).`,
    TECHNICAL_RATE_SPIKE: `Administrative whistle rate in the crew recent sample exceeds the league technical-foul baseline (${magnitude}σ).`,
    HOME_AWAY_DEVIATION: `Home and away foul distribution in the crew recent window shows an atypical split (${magnitude}σ from neutral expectation).`,
  };
  return assertObservationalCopy(templates[type]);
}

function anomalyId(gameId: string, type: AnomalyType): string {
  return `${gameId}:${type}`;
}

export function detectAnomalies(input: AnomalyEngineInput): DetectedAnomaly[] {
  if (input.crewProfiles.length === 0) return [];

  const currentSeason =
    input.currentSeason ?? input.crewProfiles[0]?.seasons.at(-1);
  const pooled = crewPooledGames(input.crewProfiles);
  const { window, games: windowGames } = pickBestRollingWindow(
    pooled,
    currentSeason,
  );

  if (windowGames.length === 0) return [];

  const foulStats = computeRollingWindowStats(
    pooled,
    window,
    input.leagueAvgFouls,
    currentSeason,
  );
  const tempoStats = tempoWindowStats(
    pooled,
    window,
    input.leagueAvgTotal,
    currentSeason,
  );

  const crewDeviationZ = foulStats.zScore ?? 0;
  const tempoDeviationZ = tempoStats.zScore ?? 0;
  const marketDivergenceZ =
    input.benchmarkTotal > 0
      ? round2(input.lineLag / Math.max(1, input.benchmarkTotal * 0.02))
      : 0;

  const severityScore = computeSeverityScore({
    crewDeviationZ,
    tempoDeviationZ,
    marketDivergenceZ,
    sampleSize: windowGames.length,
  });
  const severityLevel = mapSeverityLevel(severityScore);

  const candidates: Array<{
    type: AnomalyType;
    z: number;
    evidence: Record<string, unknown>;
  }> = [];

  if (foulStats.zScore !== null && Math.abs(foulStats.zScore) >= ANOMALY_Z_THRESHOLD) {
    candidates.push({
      type: "CREW_FOUL_DEVIATION",
      z: foulStats.zScore,
      evidence: {
        crewAverage: foulStats.mean,
        leagueAverage: foulStats.leagueMean,
        zScore: foulStats.zScore,
        sampleSize: foulStats.sampleSize,
        rollingWindow: window,
      },
    });
  }

  if (tempoStats.zScore !== null && Math.abs(tempoStats.zScore) >= ANOMALY_Z_THRESHOLD) {
    candidates.push({
      type: "TEMPO_DEVIATION",
      z: tempoStats.zScore,
      evidence: {
        crewAverage: tempoStats.mean,
        leagueAverage: tempoStats.leagueMean,
        zScore: tempoStats.zScore,
        sampleSize: tempoStats.sampleSize,
        rollingWindow: window,
      },
    });
  }

  if (Math.abs(input.lineLag) >= 4.5) {
    candidates.push({
      type: "LINE_MOVEMENT_DIVERGENCE",
      z: marketDivergenceZ,
      evidence: {
        crewAverage: tempoStats.mean,
        leagueAverage: input.benchmarkTotal,
        lineLag: round2(input.lineLag),
        zScore: marketDivergenceZ,
        sampleSize: windowGames.length,
        rollingWindow: window,
      },
    });
  }

  const replayZ = replayOutlierZ(windowGames);
  if (replayZ !== null && Math.abs(replayZ) >= ANOMALY_Z_THRESHOLD) {
    candidates.push({
      type: "REPLAY_OUTLIER",
      z: replayZ,
      evidence: {
        highLeverageFlagRate: round2(mean(
          windowGames
            .map((game) => game.highLeverageFlagRate)
            .filter((value): value is number => value !== undefined),
        )),
        zScore: replayZ,
        sampleSize: windowGames.length,
        rollingWindow: window,
      },
    });
  }

  const technicalZ = technicalRateZ(windowGames);
  if (technicalZ !== null && Math.abs(technicalZ) >= ANOMALY_Z_THRESHOLD) {
    candidates.push({
      type: "TECHNICAL_RATE_SPIKE",
      z: technicalZ,
      evidence: {
        zScore: technicalZ,
        sampleSize: windowGames.length,
        rollingWindow: window,
      },
    });
  }

  const homeAwayZ = homeAwayDeviationZ(windowGames);
  if (homeAwayZ !== null && Math.abs(homeAwayZ) >= ANOMALY_Z_THRESHOLD) {
    candidates.push({
      type: "HOME_AWAY_DEVIATION",
      z: homeAwayZ,
      evidence: {
        zScore: homeAwayZ,
        sampleSize: windowGames.length,
        rollingWindow: window,
      },
    });
  }

  if (candidates.length === 0 && severityLevel === "INFO") {
    return [];
  }

  if (candidates.length === 0) {
    candidates.push({
      type: "TEMPO_DEVIATION",
      z: tempoDeviationZ,
      evidence: {
        crewAverage: tempoStats.mean,
        leagueAverage: tempoStats.leagueMean,
        zScore: tempoDeviationZ,
        sampleSize: windowGames.length,
        rollingWindow: window,
        compositeSeverity: severityScore,
      },
    });
  }

  return candidates.map((candidate) => ({
    id: anomalyId(input.game.id, candidate.type),
    gameId: input.game.id,
    leagueId: input.leagueId,
    type: candidate.type,
    severityScore,
    severityLevel,
    zScore: round2(candidate.z),
    rollingWindowUsed: window,
    evidence: candidate.evidence,
    summary: buildSummary(candidate.type, candidate.z, window),
  }));
}
