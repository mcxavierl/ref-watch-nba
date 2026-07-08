import { getBaselinesFile } from "@/lib/baselines";
import { computeCrewDominance, CREW_DOMINANCE_MIN_GAMES } from "@/lib/crew-dominance";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { ScoredFindingBase } from "@/lib/findings-shared";
import { rankScore } from "@/lib/findings-shared";
import {
  isLeagueBenchmarkSkewSignificant,
  leagueBenchmarkLean,
  LEAGUE_WEIGHTED_OVER_MIN_SKEW,
  weightedLeagueOverRate,
} from "@/lib/findings-significance";
import {
  computeMatrixExtremes,
  computeRefTeamMatrix,
  type MatrixExtremeHighlight,
} from "@/lib/ref-team-matrix";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { buildYoYNarrative, seasonRowsFromBaselines } from "@/lib/trends";
import type { RefProfile, RefStatsFile, TeamCrewSplit } from "@/lib/types";

export interface LeagueFindingPaths {
  idPrefix: string;
  refsBrowsePath: string;
  refPath: (slug: string) => string;
  teamPath: (abbr: string) => string;
  matrixPath: string;
  crewsPath: string;
  trendsPath: string;
}

export interface LeagueFindingLabels {
  scoreUnit: string;
  whistleUnit: string;
  teamName: (abbr: string) => string;
}

export interface LeagueFindingContext {
  league: "NBA" | "NHL";
  paths: LeagueFindingPaths;
  labels: LeagueFindingLabels;
  getTeamSplits: (abbr: string) => TeamCrewSplit[];
  teams: { abbr: string; label: string; name: string; nbaId?: number }[];
}

const MIN_REF_GAMES = 50;
const MIN_TEAM_CREW_GAMES = 12;
const MIN_HOME_ROAD_SIDE = 6;
const MIN_MATRIX_GAMES = 8;
const MIN_CREW_DOMINANCE_GAMES = 12;
const MIN_CREW_DOMINANCE_DELTA = 0.15;
const MIN_WHISTLE_DELTA = 0.35;
const MIN_HOME_ROAD_GAP = 0.15;
const MIN_CLOSE_GAMES = 200;
const MIN_CLOSE_OVER_DELTA = 0.03;

function matrixFindingFromHighlight(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
  highlight: MatrixExtremeHighlight,
  idSuffix: "high" | "low",
): ScoredFindingBase {
  const teamName = ctx.labels.teamName(highlight.teamAbbr);
  const direction = highlight.kind === "high" ? "above" : "below";
  const record = `${highlight.wins}-${highlight.losses}`;

  return {
    id: `${ctx.paths.idPrefix}matrix-${idSuffix}`,
    category: "ref-team-split",
    headline: `${highlight.refName} and ${teamName}: ${Math.abs(highlight.deltaPts).toFixed(1)} pts ${direction} team baseline`,
    summary: `${teamName} are ${record} (${formatPct(highlight.winRate)}) in ${highlight.games} games with ${highlight.refName}, vs a team sample baseline of ${formatPct(highlight.baselineWinRate)}.`,
    explainer: `Matrix splits compare ref×team win rate to each team's overall record in this dataset. Standout cells require ${MIN_MATRIX_GAMES}+ games; descriptive history only.`,
    stats: [
      {
        label: "Ref×team record",
        value: record,
        detail: `${highlight.games} games · ${formatPct(highlight.winRate)}`,
      },
      {
        label: "Team baseline",
        value: `${highlight.baselineWins}-${highlight.baselineLosses}`,
        detail: `${formatPct(highlight.baselineWinRate)} across ${highlight.baselineGames} gp`,
      },
      {
        label: "Delta vs baseline",
        value: `${highlight.deltaPts >= 0 ? "+" : ""}${highlight.deltaPts.toFixed(1)} pts`,
        detail: direction.charAt(0).toUpperCase() + direction.slice(1),
      },
    ],
    sampleNote: `${highlight.games} ref×team games · min ${MIN_MATRIX_GAMES} for matrix cells · ${stats.meta.seasons.join(", ")}`,
    links: [
      { label: highlight.refName, href: ctx.paths.refPath(highlight.refSlug) },
      { label: teamName, href: ctx.paths.teamPath(highlight.teamAbbr) },
      { label: "Full matrix", href: ctx.paths.matrixPath },
    ],
    score: rankScore(
      Math.abs(highlight.deltaPts) / 25,
      highlight.games,
      MIN_MATRIX_GAMES,
    ),
    sampleGames: highlight.games,
  };
}

export function buildMatrixExtremeFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
  kind: "high" | "low",
): ScoredFindingBase | null {
  const matrix = computeRefTeamMatrix(
    stats,
    ctx.teams,
    ctx.getTeamSplits,
    MIN_MATRIX_GAMES,
  );
  const extremes = computeMatrixExtremes(matrix, 40).filter((h) => h.kind === kind);
  const best = extremes[0];
  if (!best) return null;
  return matrixFindingFromHighlight(stats, ctx, best, kind);
}

export function buildCrewDominanceFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
): ScoredFindingBase | null {
  const entries = computeCrewDominance(stats, CREW_DOMINANCE_MIN_GAMES)
    .filter(
      (e) =>
        e.games >= MIN_CREW_DOMINANCE_GAMES &&
        e.dominanceScoringDelta !== null &&
        Math.abs(e.dominanceScoringDelta) >= MIN_CREW_DOMINANCE_DELTA,
    )
    .sort(
      (a, b) =>
        Math.abs(b.dominanceScoringDelta ?? 0) -
        Math.abs(a.dominanceScoringDelta ?? 0),
    );

  const best = entries[0];
  if (!best || best.dominanceScoringDelta === null) return null;

  const crewLabel = best.crewNames.slice(0, 2).join(", ");
  const direction = best.dominanceScoringDelta >= 0 ? "higher" : "lower";

  return {
    id: `${ctx.paths.idPrefix}crew-dominance`,
    category: "team-crew",
    headline: `${crewLabel} crew runs ${Math.abs(best.dominanceScoringDelta).toFixed(1)} ${ctx.labels.scoreUnit} ${direction} than members' other games`,
    summary: `This ${best.crewNames.length}-official crew averages ${best.avgTotalPoints} combined ${ctx.labels.scoreUnit} across ${best.games} games, ${formatSigned(best.dominanceScoringDelta)} vs what those refs produce on other crews.`,
    explainer: `Crew dominance compares a recurring crew's pace to each member's non-crew baseline. Useful for spotting chemistry effects on scoring environment.`,
    stats: [
      {
        label: "Crew avg total",
        value: String(best.avgTotalPoints),
        detail: `${best.games} games · ${best.teamCount} teams`,
      },
      {
        label: "Dominance delta",
        value: formatSigned(best.dominanceScoringDelta),
        detail: `vs members' other crews`,
      },
      {
        label: "Over benchmark",
        value: formatPct(best.overRate),
        detail: `${stats.meta.leagueOverBaseline} ${ctx.labels.scoreUnit} line`,
      },
    ],
    sampleNote: `${best.games} crew games · min ${MIN_CREW_DOMINANCE_GAMES} · ${stats.meta.seasons.join(", ")}`,
    links: [
      { label: "Crew breakdown", href: ctx.paths.crewsPath },
      ...best.crewNames.slice(0, 2).map((name, i) => ({
        label: name,
        href: ctx.paths.refPath(best.memberSlugs[i] ?? best.memberSlugs[0]),
      })),
    ],
    score: rankScore(
      Math.abs(best.dominanceScoringDelta) / stats.meta.leagueAvgTotal,
      best.games,
      MIN_CREW_DOMINANCE_GAMES,
    ),
    sampleGames: best.games,
  };
}

export function buildYoYTrendFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
): ScoredFindingBase | null {
  const file = getBaselinesFile();
  const block = file[ctx.league];
  if (block.usingFallback || block.aggregate.gameCount === 0) return null;

  const rows = seasonRowsFromBaselines(block.seasons);
  const narrative = buildYoYNarrative(rows, ctx.league);
  if (!narrative || rows.length < 2) return null;

  const latest = rows[rows.length - 1];
  const prior = rows[rows.length - 2];
  const scoringDelta = latest.leagueAvgTotal - prior.leagueAvgTotal;
  const foulDelta = latest.leagueAvgFouls - prior.leagueAvgFouls;
  const minorDelta =
    latest.leagueAvgMinors !== undefined && prior.leagueAvgMinors !== undefined
      ? latest.leagueAvgMinors - prior.leagueAvgMinors
      : 0;
  const otDelta =
    latest.leagueOvertimeRate !== undefined && prior.leagueOvertimeRate !== undefined
      ? latest.leagueOvertimeRate - prior.leagueOvertimeRate
      : 0;

  const meaningful =
    Math.abs(scoringDelta) >= 0.25 ||
    Math.abs(foulDelta) >= 0.15 ||
    Math.abs(minorDelta) >= 0.08 ||
    Math.abs(otDelta) >= 0.005;
  if (!meaningful) return null;

  return {
    id: `${ctx.paths.idPrefix}yoy-trend`,
    category: "league-trend",
    headline: narrative.headline,
    summary: narrative.body,
    explainer: `Year-over-year context from ${rows.length} seasons in data/baselines.json (${block.aggregate.gameCount.toLocaleString()} total games). League-wide baselines, not ref-specific.`,
    stats: [
      {
        label: `${latest.season} avg total`,
        value: `${latest.leagueAvgTotal.toFixed(1)} ${ctx.labels.scoreUnit}`,
        detail: `${latest.gameCount.toLocaleString()} games`,
      },
      {
        label: `${prior.season} avg total`,
        value: `${prior.leagueAvgTotal.toFixed(1)} ${ctx.labels.scoreUnit}`,
        detail: `${prior.gameCount.toLocaleString()} games`,
      },
      {
        label: "YoY scoring change",
        value: formatSigned(scoringDelta),
        detail: ctx.labels.scoreUnit,
      },
    ],
    sampleNote: `${rows.length} seasons · ${block.aggregate.gameCount.toLocaleString()} games in baselines · computed from game logs`,
    links: [{ label: "Full trends", href: ctx.paths.trendsPath }],
    score: rankScore(
      Math.abs(scoringDelta) / stats.meta.leagueAvgTotal,
      latest.gameCount + prior.gameCount,
      500,
    ),
    sampleGames: latest.gameCount + prior.gameCount,
  };
}

interface HomeRoadBest {
  team: string;
  split: TeamCrewSplit;
  homeRate: number;
  awayRate: number;
  gap: number;
  homeGames: number;
  awayGames: number;
}

export function buildTeamHomeRoadFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
): ScoredFindingBase | null {
  let best: HomeRoadBest | undefined;

  for (const [team, splits] of Object.entries(stats.teamSplits)) {
    for (const split of splits) {
      if (split.games < MIN_TEAM_CREW_GAMES) continue;
      const homeGames = split.homeWins + split.homeLosses;
      const awayGames = split.awayWins + split.awayLosses;
      if (homeGames < MIN_HOME_ROAD_SIDE || awayGames < MIN_HOME_ROAD_SIDE) continue;

      const homeRate = split.homeWins / homeGames;
      const awayRate = split.awayWins / awayGames;
      const gap = Math.abs(homeRate - awayRate);
      if (gap < MIN_HOME_ROAD_GAP) continue;

      if (!best || gap > best.gap) {
        best = { team, split, homeRate, awayRate, gap, homeGames, awayGames };
      }
    }
  }

  if (!best) return null;

  const teamName = ctx.labels.teamName(best.team);
  const crewLabel = best.split.crewNames.slice(0, 2).join(", ");
  const homeStronger = best.homeRate > best.awayRate;
  const strongSide = homeStronger ? "home" : "road";
  const strongRate = homeStronger ? best.homeRate : best.awayRate;
  const weakRate = homeStronger ? best.awayRate : best.homeRate;
  const strongGames = homeStronger ? best.homeGames : best.awayGames;
  const weakGames = homeStronger ? best.awayGames : best.homeGames;

  return {
    id: `${ctx.paths.idPrefix}team-home-road`,
    category: "team-crew",
    headline: `${teamName} win ${(best.gap * 100).toFixed(0)} pts more often at ${strongSide} with this crew`,
    summary: `When ${crewLabel}${best.split.crewNames.length > 2 ? "…" : ""} work ${teamName} games, ${strongSide} win rate is ${formatPct(strongRate)} (${strongGames} gp) vs ${formatPct(weakRate)} ${homeStronger ? "on the road" : "at home"} (${weakGames} gp).`,
    explainer: `Home/road splits within a crew bucket show venue effects beyond overall team strength. Min ${MIN_HOME_ROAD_SIDE} games per side required.`,
    stats: [
      {
        label: `${strongSide.charAt(0).toUpperCase()}${strongSide.slice(1)} win rate`,
        value: formatPct(strongRate),
        detail: `${strongGames} games`,
      },
      {
        label: `${homeStronger ? "Road" : "Home"} win rate`,
        value: formatPct(weakRate),
        detail: `${weakGames} games`,
      },
      {
        label: "Home/road gap",
        value: `${(best.gap * 100).toFixed(0)} pts`,
        detail: "Win rate spread",
      },
    ],
    sampleNote: `${best.split.games} crew games · min ${MIN_HOME_ROAD_SIDE} per side · ${stats.meta.seasons.join(", ")}`,
    links: [
      { label: teamName, href: ctx.paths.teamPath(best.team) },
      { label: "Crew page", href: ctx.paths.crewsPath },
    ],
    score: rankScore(best.gap, best.homeGames + best.awayGames, MIN_TEAM_CREW_GAMES),
    sampleGames: best.homeGames + best.awayGames,
  };
}

function isCloseGame(
  game: {
    homeScore: number;
    awayScore: number;
    homeSpread: number;
    wentToOvertime?: boolean;
  },
  league: "NBA" | "NHL",
): boolean {
  if (league === "NBA") {
    return Math.abs(game.homeScore - game.awayScore) <= 5;
  }
  if (game.wentToOvertime) return true;
  return Math.abs(game.homeScore - game.awayScore) <= 1;
}

export function buildCloseGameLeagueFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
): ScoredFindingBase | null {
  const logs = loadRuntimeGameLogs(ctx.league);
  if (!logs?.games.length) return null;

  let allGames = 0;
  let allTotal = 0;
  let allOvers = 0;
  let closeGames = 0;
  let closeTotal = 0;
  let closeOvers = 0;

  for (const game of logs.games) {
    allGames += 1;
    allTotal += game.totalPoints;
    if (game.totalPoints > stats.meta.leagueOverBaseline) allOvers += 1;
    if (!isCloseGame(game, ctx.league)) continue;
    closeGames += 1;
    closeTotal += game.totalPoints;
    if (game.totalPoints > stats.meta.leagueOverBaseline) closeOvers += 1;
  }

  if (closeGames < MIN_CLOSE_GAMES || allGames === 0) return null;

  const closeOverRate = closeOvers / closeGames;
  const fullOverRate = allOvers / allGames;
  const overDelta = closeOverRate - fullOverRate;
  const closeAvg = closeTotal / closeGames;
  const fullAvg = allTotal / allGames;
  const avgDelta = closeAvg - fullAvg;

  if (
    Math.abs(overDelta) < MIN_CLOSE_OVER_DELTA &&
    Math.abs(avgDelta) < 0.4
  ) {
    return null;
  }

  const windowLabel =
    ctx.league === "NBA"
      ? "Final margin ≤5 points"
      : "One-goal or OT games";
  const lean = closeOverRate >= fullOverRate ? "over" : "under";

  return {
    id: `${ctx.paths.idPrefix}close-game-proxy`,
    category: "scoring-extreme",
    headline: `Competitive games lean ${lean} the ${stats.meta.leagueOverBaseline}-${ctx.labels.scoreUnit} benchmark`,
    summary: `${windowLabel}: ${formatPct(closeOverRate)} beat ${stats.meta.leagueOverBaseline} combined ${ctx.labels.scoreUnit} (${closeGames.toLocaleString()} games). All games: ${formatPct(fullOverRate)}.`,
    explainer: `Close-game proxy from game logs, not official last-two-minute data. Where spread lines are estimated, toss-up windows use the same proxy rules as profile pages.`,
    stats: [
      {
        label: "Close-game over rate",
        value: formatPct(closeOverRate),
        detail: `${closeGames.toLocaleString()} games`,
      },
      {
        label: "Full-sample over rate",
        value: formatPct(fullOverRate),
        detail: `${allGames.toLocaleString()} games`,
      },
      {
        label: "Avg combined total",
        value: closeAvg.toFixed(1),
        detail: `${formatSigned(avgDelta)} vs ${fullAvg.toFixed(1)} full avg`,
      },
    ],
    sampleNote: `${closeGames.toLocaleString()} close games · proxy window · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: "Methodology", href: "/methodology" }],
    score: rankScore(
      Math.abs(overDelta) + Math.abs(avgDelta) / stats.meta.leagueAvgTotal,
      closeGames,
      MIN_CLOSE_GAMES,
    ),
    sampleGames: closeGames,
  };
}

export function buildWhistleOutlierFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
): ScoredFindingBase | null {
  const qualified = stats.refs.filter((r) => r.games >= MIN_REF_GAMES);
  if (qualified.length === 0) return null;

  const ref = [...qualified].sort(
    (a, b) => Math.abs(b.foulsDelta) - Math.abs(a.foulsDelta),
  )[0];
  if (Math.abs(ref.foulsDelta) < MIN_WHISTLE_DELTA) return null;

  const direction = ref.foulsDelta >= 0 ? "heavy" : "light";

  return {
    id: `${ctx.paths.idPrefix}whistle-outlier`,
    category: "whistle-extreme",
    headline: `${ref.name} runs the ${direction === "heavy" ? "highest" : "lowest"} ${ctx.labels.whistleUnit} pace in the pool`,
    summary: `${ref.name} averages ${ref.avgFouls} ${ctx.labels.whistleUnit} per game (${formatSigned(ref.foulsDelta)} vs league) across ${ref.games} games, the largest whistle delta among ${MIN_REF_GAMES}+ game refs.`,
    stats: [
      {
        label: `${ctx.labels.whistleUnit} per game`,
        value: String(ref.avgFouls),
        detail: `${formatSigned(ref.foulsDelta)} vs ${stats.meta.leagueAvgFouls} league avg`,
      },
      {
        label: "Over benchmark",
        value: formatPct(ref.overRate),
        detail: `${stats.meta.leagueOverBaseline} ${ctx.labels.scoreUnit}`,
      },
      {
        label: "Sample",
        value: String(ref.games),
        detail: `Min ${MIN_REF_GAMES} games`,
      },
    ],
    sampleNote: `${ref.games} games · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: ref.name, href: ctx.paths.refPath(ref.slug) }],
    score: rankScore(
      Math.abs(ref.foulsDelta) / Math.max(stats.meta.leagueAvgFouls, 1),
      ref.games,
      MIN_REF_GAMES,
    ),
    sampleGames: ref.games,
  };
}

export function buildOverRateOutlierFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
  direction: "high" | "low",
): ScoredFindingBase | null {
  const qualified = stats.refs.filter((r) => r.games >= MIN_REF_GAMES);
  if (qualified.length === 0) return null;

  const sorted =
    direction === "high"
      ? [...qualified].sort((a, b) => b.overRate - a.overRate)
      : [...qualified].sort((a, b) => a.overRate - b.overRate);
  const ref = sorted[0];
  const edge = Math.abs(ref.overRate - 0.5);
  if (edge < 0.03) return null;

  const lean = direction === "high" ? "over" : "under";

  return {
    id: `${ctx.paths.idPrefix}${lean}-rate-outlier`,
    category: "ref-outlier",
    headline: `${ref.name} leads the pool on ${lean} frequency`,
    summary: `${formatPct(ref.overRate)} of ${ref.name}'s ${ref.games} games finish ${lean} ${stats.meta.leagueOverBaseline} combined ${ctx.labels.scoreUnit}, ${(edge * 100).toFixed(1)} pts from a neutral 50% baseline.`,
    stats: [
      {
        label: "Over benchmark",
        value: formatPct(ref.overRate),
        detail: `${ref.games} games`,
      },
      {
        label: "Avg combined total",
        value: String(ref.avgTotalPoints),
        detail: `${formatSigned(ref.totalPointsDelta)} vs league`,
      },
      {
        label: "Delta vs 50%",
        value: `${(edge * 100).toFixed(1)} pts`,
        detail: `Leans ${lean}`,
      },
    ],
    sampleNote: `${MIN_REF_GAMES}+ game sample · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: ref.name, href: ctx.paths.refPath(ref.slug) }],
    score: rankScore(edge, ref.games, MIN_REF_GAMES),
    sampleGames: ref.games,
  };
}

export function buildLeagueSkewFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
  lean?: "over" | "under",
): ScoredFindingBase | null {
  const { refs, meta } = stats;
  const weightedOver = weightedLeagueOverRate(refs);
  if (!isLeagueBenchmarkSkewSignificant(weightedOver)) return null;

  const resolvedLean = lean ?? leagueBenchmarkLean(weightedOver);
  if (resolvedLean === "neutral") return null;

  const trending =
    resolvedLean === "under"
      ? refs.filter((r) => r.overRate < 0.5)
      : refs.filter((r) => r.overRate > 0.5);
  const other =
    resolvedLean === "under"
      ? refs.filter((r) => r.overRate > 0.5)
      : refs.filter((r) => r.overRate < 0.5);
  const totalGames =
    meta.totalGamesProcessed ?? refs.reduce((sum, r) => sum + r.games, 0);
  const pct = Math.round((trending.length / refs.length) * 100);
  const effectSize =
    resolvedLean === "under" ? 0.5 - weightedOver : weightedOver - 0.5;

  return {
    id: `${ctx.paths.idPrefix}league-${resolvedLean}-skew`,
    category: "league-trend",
    headline:
      resolvedLean === "under"
        ? `Games-weighted scoring sits ${(effectSize * 100).toFixed(0)} pts under neutral`
        : `Games-weighted scoring sits ${(effectSize * 100).toFixed(0)} pts over neutral`,
    summary: `${trending.length} of ${refs.length} officials (${pct}%) trend ${resolvedLean} the ${meta.leagueOverBaseline} combined ${ctx.labels.scoreUnit} benchmark; weighted over rate is ${formatPct(weightedOver)} across ${totalGames.toLocaleString()} games.`,
    explainer: `This measures historical scoring frequency vs a fixed benchmark, not sportsbook pricing. We only surface league skew when the games-weighted over rate is at least ${(LEAGUE_WEIGHTED_OVER_MIN_SKEW * 100).toFixed(0)} pts from 50%.`,
    stats: [
      {
        label: `Refs trending ${resolvedLean}`,
        value: `${trending.length}/${refs.length}`,
        detail: `${pct}% of pool`,
      },
      {
        label: "Weighted over rate",
        value: formatPct(weightedOver),
        detail: "50% = neutral baseline",
      },
      {
        label: "Games analyzed",
        value: totalGames.toLocaleString(),
        detail: meta.seasons.join(", "),
      },
    ],
    sampleNote: `${refs.length} refs · ${totalGames.toLocaleString()} games · ${meta.source} data`,
    links: [{ label: "Browse refs", href: ctx.paths.refsBrowsePath }],
    score: rankScore(effectSize, totalGames, MIN_REF_GAMES),
    sampleGames: totalGames,
  };
}

export function buildNhlMinorsOutlierFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
): ScoredFindingBase | null {
  const MIN_ANALYTICS_GAMES = 30;
  let best: { ref: RefProfile; rate: number; delta: number } | undefined;

  for (const ref of stats.refs) {
    const analytics = ref.nhlAnalytics;
    if (!analytics || ref.games < MIN_ANALYTICS_GAMES) continue;
    const delta = analytics.minorsDelta;
    if (Math.abs(delta) < 0.05 && analytics.avgMinorsPerGame < 7.2) continue;
    if (
      !best ||
      Math.abs(analytics.avgMinorsPerGame - stats.meta.leagueAvgMinors!) >
        Math.abs(best.rate - stats.meta.leagueAvgMinors!)
    ) {
      best = { ref, rate: analytics.avgMinorsPerGame, delta: analytics.minorsDelta };
    }
  }

  if (!best) return null;
  const leagueMinors = stats.meta.leagueAvgMinors ?? 7.5;

  return {
    id: `${ctx.paths.idPrefix}minors-outlier`,
    category: "whistle-extreme",
    headline: `${best.ref.name} runs the heaviest minor-penalty pace`,
    summary: `${best.ref.name} averages ${best.rate.toFixed(1)} two-minute minors per team per game (${formatSigned(best.delta)} vs league) across ${best.ref.games} games.`,
    explainer: `Minor penalty rate is descriptive game-management pattern from NHL logs. Not a live foul-trouble or power-play edge.`,
    stats: [
      {
        label: "Minors per team",
        value: best.rate.toFixed(1),
        detail: `${formatSigned(best.delta)} vs ${leagueMinors.toFixed(1)} league avg`,
      },
      {
        label: "Over benchmark",
        value: formatPct(best.ref.overRate),
        detail: `${stats.meta.leagueOverBaseline} goals`,
      },
      {
        label: "Sample",
        value: String(best.ref.games),
        detail: `Min ${MIN_ANALYTICS_GAMES} games`,
      },
    ],
    sampleNote: `${best.ref.games} games · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: best.ref.name, href: ctx.paths.refPath(best.ref.slug) }],
    score: rankScore(
      Math.abs(best.rate - leagueMinors) / leagueMinors,
      best.ref.games,
      MIN_ANALYTICS_GAMES,
    ),
    sampleGames: best.ref.games,
  };
}

export function buildNhlOtOutlierFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
): ScoredFindingBase | null {
  const MIN_ANALYTICS_GAMES = 30;
  const leagueOt = stats.meta.leagueOvertimeRate ?? 0.11;
  const MIN_OT_EDGE = 0.025;

  let best:
    | { ref: RefProfile; rate: number; otGames: number; edge: number }
    | undefined;

  for (const ref of stats.refs) {
    const analytics = ref.nhlAnalytics;
    if (!analytics || ref.games < MIN_ANALYTICS_GAMES) continue;
    const edge = analytics.overtimeRate - leagueOt;
    if (Math.abs(edge) < MIN_OT_EDGE) continue;
    if (!best || Math.abs(edge) > Math.abs(best.edge)) {
      best = {
        ref,
        rate: analytics.overtimeRate,
        otGames: analytics.overtimeGames,
        edge,
      };
    }
  }

  if (!best) return null;

  return {
    id: `${ctx.paths.idPrefix}ot-outlier`,
    category: "ref-outlier",
    headline: `${best.ref.name} pushes ${formatPct(best.rate)} of games to OT/SO`,
    summary: `${best.ref.name} reaches overtime or shootout ${formatPct(best.rate)} of the time (${best.otGames} of ${best.ref.games} games), ${(Math.abs(best.edge) * 100).toFixed(1)} pts ${best.edge >= 0 ? "above" : "below"} the ${formatPct(leagueOt)} league rate.`,
    stats: [
      {
        label: "OT/SO rate",
        value: formatPct(best.rate),
        detail: `${best.otGames} OT/SO games`,
      },
      {
        label: "League OT rate",
        value: formatPct(leagueOt),
        detail: "Pool baseline",
      },
      {
        label: "Sample",
        value: String(best.ref.games),
        detail: `Min ${MIN_ANALYTICS_GAMES} games`,
      },
    ],
    sampleNote: `${best.ref.games} games · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: best.ref.name, href: ctx.paths.refPath(best.ref.slug) }],
    score: rankScore(Math.abs(best.edge), best.ref.games, MIN_ANALYTICS_GAMES),
    sampleGames: best.ref.games,
  };
}
