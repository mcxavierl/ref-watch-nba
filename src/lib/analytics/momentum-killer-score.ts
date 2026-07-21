import {
  meetsSampleSizeThreshold,
  SAMPLE_SIZE_THRESHOLD,
  type DataQualityState,
} from "@/lib/analytics/sample-size";
import type { LeagueId } from "@/lib/leagues";
import type {
  CrewStoppageEvent,
  CrewStoppageKind,
  MomentumKillerLabel,
  ScoringPlayEvent,
  ScoringRunEvent,
} from "@/lib/types";

export const SCORING_RUN_MIN_UNANSWERED_POINTS = 8;
export const SCORING_RUN_WINDOW_SECONDS = 180;
export const SCORING_RUN_WINDOW_MIN_POINTS = 10;
export const SCORING_RUN_WINDOW_MAX_OPPOSING_POINTS = 2;
export const MOMENTUM_KILLER_MIN_RUNS = 8;
export const MOMENTUM_KILLER_SAMPLE_WINDOW = 50;

export const MOMENTUM_KILLER_METHOD_NOTE =
  "Momentum Killer Score uses play-by-play scoring timelines. Runs qualify at 8+ unanswered points or a 10-2 margin inside three minutes. Only non-mandatory crew stoppages count as interruptions.";

/** League prior when per-season run-interruption baselines are unavailable. */
export const DEFAULT_LEAGUE_RUN_STOPPAGE_RATE = 0.35;

export const MOMENTUM_KILLER_LABELS: Record<MomentumKillerLabel, string> = {
  "high-run-interrupter": "High Run Interrupter",
  "elevated-run-interrupter": "Elevated Run Interrupter",
  "neutral-flow": "Neutral Flow",
  "flow-enabler": "Flow Enabler",
  "high-flow-enabler": "High Flow Enabler",
};

const BASKETBALL_LEAGUES = new Set<LeagueId>(["nba", "wnba", "cbb"]);

export type MomentumKillerGameInput = {
  homeTeam: string;
  awayTeam: string;
  scoringPlays?: ScoringPlayEvent[];
  crewStoppages?: CrewStoppageEvent[];
};

export type MomentumKillerRunSummary = {
  runs: ScoringRunEvent[];
  opponentScoringRuns: number;
  runInterruptions: number;
  scoringRunBacked: boolean;
};

export type MomentumKillerIndexResult = {
  run_stoppage_rate: number | null;
  momentum_killer_score: number | null;
  momentum_killer_label: MomentumKillerLabel | null;
  scoring_run_backed_games: number;
  opponent_scoring_runs: number;
  run_interruptions: number;
  momentum_method_note: string;
  data_quality: DataQualityState;
};

type TimelineEvent =
  | { kind: "score"; time: number; team: string; points: number }
  | { kind: "stoppage"; time: number; stoppage: CrewStoppageEvent };

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function opponentTeam(
  team: string,
  homeTeam: string,
  awayTeam: string,
): string {
  return team === homeTeam ? awayTeam : homeTeam;
}

function isCrewInterruptionStoppage(stoppage: CrewStoppageEvent): boolean {
  if (stoppage.mandatory || stoppage.kind === "mandatory-foul") return false;
  return (
    stoppage.kind === "subjective-foul" ||
    stoppage.kind === "administrative" ||
    stoppage.kind === "technical" ||
    stoppage.kind === "video-review"
  );
}

function windowTotals(
  plays: ScoringPlayEvent[],
  runningTeam: string,
  endSeconds: number,
): { runningPoints: number; opposingPoints: number } {
  const startSeconds = endSeconds - SCORING_RUN_WINDOW_SECONDS;
  let runningPoints = 0;
  let opposingPoints = 0;

  for (const play of plays) {
    if (play.gameSecondsElapsed < startSeconds || play.gameSecondsElapsed > endSeconds) {
      continue;
    }
    if (play.team === runningTeam) {
      runningPoints += play.points;
    } else {
      opposingPoints += play.points;
    }
  }

  return { runningPoints, opposingPoints };
}

function qualifiesAsScoringRun(
  runningTeam: string,
  unansweredPoints: number,
  opposingPoints: number,
  plays: ScoringPlayEvent[],
  endSeconds: number,
): boolean {
  if (unansweredPoints >= SCORING_RUN_MIN_UNANSWERED_POINTS && opposingPoints === 0) {
    return true;
  }

  const windowed = windowTotals(plays, runningTeam, endSeconds);
  return (
    windowed.runningPoints >= SCORING_RUN_WINDOW_MIN_POINTS &&
    windowed.opposingPoints <= SCORING_RUN_WINDOW_MAX_OPPOSING_POINTS
  );
}

function buildTimeline(
  scoringPlays: ScoringPlayEvent[],
  crewStoppages: CrewStoppageEvent[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...scoringPlays.map((play) => ({
      kind: "score" as const,
      time: play.gameSecondsElapsed,
      team: play.team,
      points: play.points,
    })),
    ...crewStoppages.map((stoppage) => ({
      kind: "stoppage" as const,
      time: stoppage.gameSecondsElapsed,
      stoppage,
    })),
  ];

  return events.sort(
    (left, right) =>
      left.time - right.time ||
      (left.kind === "stoppage" && right.kind === "score" ? -1 : 0),
  );
}

function closeRun(
  runId: string,
  runningTeam: string,
  homeTeam: string,
  awayTeam: string,
  startSeconds: number,
  endSeconds: number,
  runningPoints: number,
  opposingPoints: number,
  lastStoppage: CrewStoppageEvent | null,
): ScoringRunEvent {
  const endedByCrewStoppage =
    lastStoppage !== null && isCrewInterruptionStoppage(lastStoppage);

  return {
    runId,
    runningTeam,
    defendingTeam: opponentTeam(runningTeam, homeTeam, awayTeam),
    startSeconds,
    endSeconds,
    runningPoints,
    opposingPoints,
    endedByCrewStoppage,
    stoppageKind: endedByCrewStoppage ? lastStoppage?.kind : undefined,
  };
}

export function detectScoringRuns(
  homeTeam: string,
  awayTeam: string,
  scoringPlays: ScoringPlayEvent[],
  crewStoppages: CrewStoppageEvent[] = [],
): ScoringRunEvent[] {
  if (scoringPlays.length === 0) return [];

  const timeline = buildTimeline(scoringPlays, crewStoppages);
  const runs: ScoringRunEvent[] = [];
  let runCounter = 0;

  let streakTeam: string | null = null;
  let streakStart = 0;
  let streakRunningPoints = 0;
  let streakOpposingPoints = 0;
  let streakPlays: ScoringPlayEvent[] = [];
  let lastStoppage: CrewStoppageEvent | null = null;

  const pushRunIfQualified = (endSeconds: number) => {
    if (!streakTeam) return;

    const qualified = qualifiesAsScoringRun(
      streakTeam,
      streakRunningPoints,
      streakOpposingPoints,
      streakPlays,
      endSeconds,
    );
    if (!qualified) return;

    runs.push(
      closeRun(
        `run-${runCounter += 1}`,
        streakTeam,
        homeTeam,
        awayTeam,
        streakStart,
        endSeconds,
        streakRunningPoints,
        streakOpposingPoints,
        lastStoppage,
      ),
    );
  };

  const resetStreak = () => {
    streakTeam = null;
    streakStart = 0;
    streakRunningPoints = 0;
    streakOpposingPoints = 0;
    streakPlays = [];
    lastStoppage = null;
  };

  for (const event of timeline) {
    if (event.kind === "stoppage") {
      lastStoppage = event.stoppage;
      continue;
    }

    if (!streakTeam) {
      streakTeam = event.team;
      streakStart = event.time;
      streakRunningPoints = event.points;
      streakOpposingPoints = 0;
      streakPlays = [
        {
          team: event.team,
          points: event.points,
          gameSecondsElapsed: event.time,
        },
      ];
      lastStoppage = null;
      continue;
    }

    if (event.team !== streakTeam) {
      pushRunIfQualified(event.time);
      resetStreak();
      streakTeam = event.team;
      streakStart = event.time;
      streakRunningPoints = event.points;
      streakOpposingPoints = 0;
      streakPlays = [
        {
          team: event.team,
          points: event.points,
          gameSecondsElapsed: event.time,
        },
      ];
      lastStoppage = null;
      continue;
    }

    streakRunningPoints += event.points;
    streakPlays.push({
      team: event.team,
      points: event.points,
      gameSecondsElapsed: event.time,
    });
  }

  const finalEnd =
    timeline.length > 0 ? timeline[timeline.length - 1]!.time : 0;
  pushRunIfQualified(finalEnd);
  return runs;
}

export function summarizeMomentumRuns(
  game: MomentumKillerGameInput,
): MomentumKillerRunSummary {
  const scoringPlays = game.scoringPlays ?? [];
  const crewStoppages = game.crewStoppages ?? [];

  if (scoringPlays.length === 0) {
    return {
      runs: [],
      opponentScoringRuns: 0,
      runInterruptions: 0,
      scoringRunBacked: false,
    };
  }

  const runs = detectScoringRuns(
    game.homeTeam,
    game.awayTeam,
    scoringPlays,
    crewStoppages,
  );

  return {
    runs,
    opponentScoringRuns: runs.length,
    runInterruptions: runs.filter((run) => run.endedByCrewStoppage).length,
    scoringRunBacked: true,
  };
}

export function momentumKillerLabelFromScore(
  score: number | null,
): MomentumKillerLabel | null {
  if (score === null) return null;
  if (score >= 75) return "high-run-interrupter";
  if (score >= 60) return "elevated-run-interrupter";
  if (score >= 40) return "neutral-flow";
  if (score >= 25) return "flow-enabler";
  return "high-flow-enabler";
}

export function normalizeMomentumKillerScore(
  runStoppageRate: number,
  leagueBaselineRate: number,
  leagueSpread = 0.12,
): number {
  if (!Number.isFinite(runStoppageRate) || !Number.isFinite(leagueBaselineRate)) {
    return 50;
  }
  const spread = Math.max(leagueSpread, 0.04);
  const z = (runStoppageRate - leagueBaselineRate) / spread;
  return round1(clamp(50 + z * 25, 0, 100));
}

export function leagueRunStoppageBaseline(rates: number[]): number {
  const valid = rates.filter((rate) => Number.isFinite(rate) && rate >= 0);
  if (valid.length === 0) return 0.35;
  const sorted = [...valid].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round3((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return round3(sorted[mid]!);
}

function insufficientMomentumResult(
  backedGames: number,
  runs = 0,
  interruptions = 0,
): MomentumKillerIndexResult {
  return {
    run_stoppage_rate: null,
    momentum_killer_score: null,
    momentum_killer_label: null,
    scoring_run_backed_games: backedGames,
    opponent_scoring_runs: runs,
    run_interruptions: interruptions,
    momentum_method_note: MOMENTUM_KILLER_METHOD_NOTE,
    data_quality: "insufficient",
  };
}

export function computeRawRunStoppageRate(
  games: MomentumKillerGameInput[],
  options?: { sampleWindow?: number },
): {
  run_stoppage_rate: number | null;
  scoring_run_backed_games: number;
  opponent_scoring_runs: number;
  run_interruptions: number;
} {
  const sampleWindow = options?.sampleWindow ?? MOMENTUM_KILLER_SAMPLE_WINDOW;
  const sampleGames = games.slice(-sampleWindow);

  let backedGames = 0;
  let totalRuns = 0;
  let totalInterruptions = 0;

  for (const game of sampleGames) {
    const summary = summarizeMomentumRuns(game);
    if (!summary.scoringRunBacked) continue;
    backedGames += 1;
    totalRuns += summary.opponentScoringRuns;
    totalInterruptions += summary.runInterruptions;
  }

  if (totalRuns < MOMENTUM_KILLER_MIN_RUNS) {
    return {
      run_stoppage_rate: null,
      scoring_run_backed_games: backedGames,
      opponent_scoring_runs: totalRuns,
      run_interruptions: totalInterruptions,
    };
  }

  return {
    run_stoppage_rate: round3(totalInterruptions / totalRuns),
    scoring_run_backed_games: backedGames,
    opponent_scoring_runs: totalRuns,
    run_interruptions: totalInterruptions,
  };
}

export function computeMomentumKillerIndex(
  leagueId: LeagueId,
  games: MomentumKillerGameInput[],
  options?: {
    sampleWindow?: number;
    leagueBaselineRate?: number | null;
    minSampleGames?: number;
  },
): MomentumKillerIndexResult {
  if (!BASKETBALL_LEAGUES.has(leagueId)) {
    return insufficientMomentumResult(0);
  }

  const minSampleGames = options?.minSampleGames ?? SAMPLE_SIZE_THRESHOLD;
  const raw = computeRawRunStoppageRate(games, options);
  if (raw.run_stoppage_rate === null) {
    return insufficientMomentumResult(
      raw.scoring_run_backed_games,
      raw.opponent_scoring_runs,
      raw.run_interruptions,
    );
  }

  const baseline =
    options?.leagueBaselineRate ?? leagueRunStoppageBaseline([raw.run_stoppage_rate]);
  const score = normalizeMomentumKillerScore(raw.run_stoppage_rate, baseline);

  return {
    run_stoppage_rate: raw.run_stoppage_rate,
    momentum_killer_score: score,
    momentum_killer_label: momentumKillerLabelFromScore(score),
    scoring_run_backed_games: raw.scoring_run_backed_games,
    opponent_scoring_runs: raw.opponent_scoring_runs,
    run_interruptions: raw.run_interruptions,
    momentum_method_note: MOMENTUM_KILLER_METHOD_NOTE,
    data_quality:
      raw.scoring_run_backed_games >= minSampleGames &&
      raw.opponent_scoring_runs >= MOMENTUM_KILLER_MIN_RUNS &&
      meetsSampleSizeThreshold(raw.scoring_run_backed_games)
        ? "ok"
        : "insufficient",
  };
}

export function momentumFieldsFromResult(
  result: MomentumKillerIndexResult,
): Pick<
  import("@/lib/types").OfficialStats,
  | "run_stoppage_rate"
  | "momentum_killer_score"
  | "momentum_killer_label"
  | "scoring_run_backed_games"
  | "opponent_scoring_runs"
  | "run_interruptions"
  | "momentum_method_note"
> {
  return {
    run_stoppage_rate: result.run_stoppage_rate,
    momentum_killer_score: result.momentum_killer_score,
    momentum_killer_label: result.momentum_killer_label,
    scoring_run_backed_games: result.scoring_run_backed_games,
    opponent_scoring_runs: result.opponent_scoring_runs,
    run_interruptions: result.run_interruptions,
    momentum_method_note: result.momentum_method_note,
  };
}

export function finalizeMomentumKillerScores(
  results: Array<{
    slug: string;
    rawRate: number | null;
    backedGames: number;
    runs: number;
    interruptions: number;
  }>,
  leagueSpread?: number,
): Map<
  string,
  Pick<
    MomentumKillerIndexResult,
    "momentum_killer_score" | "momentum_killer_label" | "run_stoppage_rate"
  >
> {
  const baseline = leagueRunStoppageBaseline(
    results
      .map((entry) => entry.rawRate)
      .filter((rate): rate is number => rate !== null),
  );

  const finalized = new Map<
    string,
    Pick<
      MomentumKillerIndexResult,
      "momentum_killer_score" | "momentum_killer_label" | "run_stoppage_rate"
    >
  >();

  for (const entry of results) {
    if (entry.rawRate === null) {
      finalized.set(entry.slug, {
        run_stoppage_rate: null,
        momentum_killer_score: null,
        momentum_killer_label: null,
      });
      continue;
    }

    const score = normalizeMomentumKillerScore(
      entry.rawRate,
      baseline,
      leagueSpread,
    );
    finalized.set(entry.slug, {
      run_stoppage_rate: entry.rawRate,
      momentum_killer_score: score,
      momentum_killer_label: momentumKillerLabelFromScore(score),
    });
  }

  return finalized;
}

export function isBasketballMomentumLeague(leagueId: LeagueId): boolean {
  return BASKETBALL_LEAGUES.has(leagueId);
}

export type { CrewStoppageKind };
