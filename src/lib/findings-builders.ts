import { DEFAULT_SINCE_SEASON, NBA_TEN_SEASONS } from "@/lib/league-seasons";
import { getBaselinesFile } from "@/lib/baselines";
import { computeCrewDominance, CREW_DOMINANCE_MIN_GAMES } from "@/lib/crew-dominance";
import {
  closeGameLeanHeadline,
  formatFindingSampleMeta,
  isNeutralRate,
  minorsPaceHeadline,
  overBenchmarkStatLabel,
  overUnderFrequencyHeadline,
  whistlePaceHeadline,
} from "@/lib/finding-copy";
import { findingMetricLabels } from "@/lib/finding-labels";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { ScoredFindingBase } from "@/lib/findings-shared";
import { rankScore } from "@/lib/findings-shared";
import { isProVerifiedLiveLeague } from "@/lib/league-verification";
import {
  MARQUEE_CI_MIN_GAMES,
  scanLeagueMarqueeEfficiency,
} from "@/lib/marquee-metrics";
import {
  isLeagueBenchmarkSkewSignificant,
  leagueBenchmarkLean,
  LEAGUE_WEIGHTED_OVER_MIN_SKEW,
  weightedLeagueOverRate,
} from "@/lib/findings-significance";
import {
  computeMatrixExtremes,
  type MatrixExtremeHighlight,
} from "@/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { buildYoYNarrative, seasonRowsFromBaselines } from "@/lib/trends";
import type { RefProfile, RefStatsFile, TeamCrewSplit } from "@/lib/types";
import {
  FRICTION_MIN_H2H_GAMES,
  scanFrictionGrudgeMatrix,
  type FrictionGrudgeFinding,
} from "@/lib/friction-grudge-matrix";
import type { LeagueId } from "@/lib/leagues";

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
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
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

const MATRIX_LEAGUE: Record<
  LeagueFindingContext["league"],
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb"
> = {
  NBA: "nba",
  NHL: "nhl",
  NFL: "nfl",
  EPL: "epl",
  LALIGA: "laliga",
  CBB: "cbb",
  CFB: "cfb",
};

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
        value:
          highlight.baselineGames > 0
            ? `${highlight.baselineWins}-${highlight.baselineLosses}`
            : "Unavailable",
        detail:
          highlight.baselineGames > 0
            ? `${formatPct(highlight.baselineWinRate)} across ${highlight.baselineGames} gp`
            : "Team sample not loaded",
      },
      {
        label: "Delta vs baseline",
        value: `${highlight.deltaPts >= 0 ? "+" : ""}${highlight.deltaPts.toFixed(1)} pts`,
        detail: direction.charAt(0).toUpperCase() + direction.slice(1),
      },
    ],
    sampleNote: formatFindingSampleMeta(highlight.games, stats.meta.seasons),
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
    {
      league: MATRIX_LEAGUE[ctx.league],
      sinceSeason: DEFAULT_SINCE_SEASON,
    },
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
        label: overBenchmarkStatLabel(best.overRate),
        value: formatPct(best.overRate),
        detail: `${stats.meta.leagueOverBaseline} ${ctx.labels.scoreUnit} line`,
      },
    ],
    sampleNote: formatFindingSampleMeta(best.games, stats.meta.seasons),
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
  const block = file[ctx.league === "LALIGA" ? "EPL" : ctx.league];
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
    explainer: `Year-over-year context from ${rows.length} seasons (${block.aggregate.gameCount.toLocaleString()} total games). League-wide baselines, not ref-specific.`,
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
    sampleNote: formatFindingSampleMeta(
      latest.gameCount + prior.gameCount,
      rows.map((row) => row.season),
    ),
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
    sampleNote: formatFindingSampleMeta(
      best.homeGames + best.awayGames,
      stats.meta.seasons,
    ),
    links: [
      { label: teamName, href: ctx.paths.teamPath(best.team) },
      { label: "Ref×team matrix", href: ctx.paths.matrixPath },
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
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB",
): boolean {
  if (league === "NBA" || league === "CBB") {
    return Math.abs(game.homeScore - game.awayScore) <= 5;
  }
  if (league === "NFL" || league === "CFB") {
    return Math.abs(game.homeScore - game.awayScore) <= 7;
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
    headline: closeGameLeanHeadline(
      closeOverRate,
      stats.meta.leagueOverBaseline,
      ctx.labels.scoreUnit,
    ),
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
    sampleNote: formatFindingSampleMeta(closeGames, stats.meta.seasons),
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

  const metricLabels = findingMetricLabels(ctx.league);

  return {
    id: `${ctx.paths.idPrefix}whistle-outlier`,
    category: "whistle-extreme",
    headline: whistlePaceHeadline(
      ref.name,
      ref.foulsDelta,
      metricLabels.whistle,
      ref.overRate,
    ),
    summary: `${ref.name} averages ${ref.avgFouls} ${metricLabels.whistle} per game (${formatSigned(ref.foulsDelta)} vs league) across ${ref.games} games, the largest whistle delta among ${MIN_REF_GAMES}+ game refs.`,
    explainer: `Whistle pace compares ${metricLabels.whistle} volume to the league average in this dataset. High or low foul counts do not automatically predict scoring or spread outcomes.`,
    stats: [
      {
        label: `${metricLabels.whistle} per game`,
        value: String(ref.avgFouls),
        detail: `${formatSigned(ref.foulsDelta)} vs ${stats.meta.leagueAvgFouls} league avg`,
      },
      {
        label: overBenchmarkStatLabel(ref.overRate),
        value: formatPct(ref.overRate),
        detail: `${stats.meta.leagueOverBaseline} ${metricLabels.overBenchmark}`,
      },
      {
        label: `Avg combined ${metricLabels.score}`,
        value: String(ref.avgTotalPoints),
        detail: `${formatSigned(ref.totalPointsDelta)} vs league`,
      },
    ],
    sampleNote: formatFindingSampleMeta(ref.games, stats.meta.seasons),
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
  if (edge < 0.03 || isNeutralRate(ref.overRate)) return null;

  const lean = direction === "high" ? "over" : "under";
  const metricLabels = findingMetricLabels(ctx.league);

  return {
    id: `${ctx.paths.idPrefix}${lean}-rate-outlier`,
    category: "ref-outlier",
    headline: overUnderFrequencyHeadline(ref.name, ref.overRate, direction),
    summary: `${formatPct(ref.overRate)} of ${ref.name}'s ${ref.games} games finish ${lean} ${stats.meta.leagueOverBaseline} combined ${metricLabels.score}, ${(edge * 100).toFixed(1)} pts from a neutral 50% baseline.`,
    explainer: `Personal over rate tracks how often this official's games clear the fixed ${stats.meta.leagueOverBaseline}-${metricLabels.overBenchmark} benchmark. Descriptive frequency, not sportsbook pricing.`,
    stats: [
      {
        label: overBenchmarkStatLabel(ref.overRate),
        value: formatPct(ref.overRate),
        detail: `${ref.games} games`,
      },
      {
        label: `Avg combined ${metricLabels.score}`,
        value: String(ref.avgTotalPoints),
        detail: `${formatSigned(ref.totalPointsDelta)} vs league`,
      },
      {
        label: "Delta vs 50%",
        value: `${(edge * 100).toFixed(1)} pts`,
        detail: `Leans ${lean}`,
      },
    ],
    sampleNote: formatFindingSampleMeta(ref.games, stats.meta.seasons),
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
  const benchmark = `${meta.leagueOverBaseline} combined ${ctx.labels.scoreUnit}`;
  const gamesOver = formatPct(weightedOver);
  const gamesUnder = formatPct(1 - weightedOver);
  const refMajorityClause =
    trending.length === refs.length
      ? `Every official (${trending.length}/${refs.length})`
      : `${trending.length} of ${refs.length} officials (${pct}%)`;
  const summary =
    resolvedLean === "under"
      ? `${refMajorityClause} finish under the ${benchmark} line in a majority of their own games (personal over rate below 50%). Across all ${totalGames.toLocaleString()} games, ${gamesOver} cleared the benchmark and ${gamesUnder} went under.`
      : `${refMajorityClause} beat the ${benchmark} line in a majority of their own games (personal over rate above 50%). Across all ${totalGames.toLocaleString()} games, ${gamesOver} finished over and ${gamesUnder} went under.`;

  return {
    id: `${ctx.paths.idPrefix}league-${resolvedLean}-skew`,
    category: "league-trend",
    headline:
      resolvedLean === "under"
        ? `Games-weighted scoring sits ${(effectSize * 100).toFixed(0)} pts under neutral`
        : `Games-weighted scoring sits ${(effectSize * 100).toFixed(0)} pts over neutral`,
    summary,
    explainer: `Two different cuts of the same data: each ref's personal over rate asks whether they beat the ${benchmark} in most of their games; the league-wide share counts every game individually. A ref can lean over while many of their games still go under. This uses a fixed benchmark, not sportsbook pricing.`,
    stats: [
      {
        label: `Refs mostly ${resolvedLean}`,
        value: `${trending.length}/${refs.length}`,
        detail: `Personal over rate ${resolvedLean === "under" ? "<" : ">"} 50%`,
      },
      {
        label: "Games over benchmark",
        value: gamesOver,
        detail: `${gamesUnder} under · 50% = neutral`,
      },
      {
        label: "Games analyzed",
        value: totalGames.toLocaleString(),
        detail: meta.seasons.join(", "),
      },
    ],
    sampleNote: formatFindingSampleMeta(totalGames, meta.seasons),
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
  const metricLabels = findingMetricLabels(ctx.league);

  return {
    id: `${ctx.paths.idPrefix}minors-outlier`,
    category: "whistle-extreme",
    headline: minorsPaceHeadline(best.ref.name, best.delta),
    summary: `${best.ref.name} averages ${best.rate.toFixed(1)} two-minute minors per team per game (${formatSigned(best.delta)} vs league) across ${best.ref.games} games.`,
    explainer: `Minor penalty rate is a descriptive game-management pattern from NHL logs. Not a live foul-trouble or power-play edge.`,
    stats: [
      {
        label: "Minors per team",
        value: best.rate.toFixed(1),
        detail: `${formatSigned(best.delta)} vs ${leagueMinors.toFixed(1)} league avg`,
      },
      {
        label: overBenchmarkStatLabel(best.ref.overRate),
        value: formatPct(best.ref.overRate),
        detail: `${stats.meta.leagueOverBaseline} ${metricLabels.overBenchmark}`,
      },
      {
        label: `Avg combined ${metricLabels.score}`,
        value: String(best.ref.avgTotalPoints),
        detail: `${formatSigned(best.ref.totalPointsDelta)} vs league`,
      },
    ],
    sampleNote: formatFindingSampleMeta(best.ref.games, stats.meta.seasons),
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

  const metricLabels = findingMetricLabels(ctx.league);
  const otLabel = metricLabels.otRate ?? "OT/SO rate";

  return {
    id: `${ctx.paths.idPrefix}ot-outlier`,
    category: "ref-outlier",
    headline: `${best.ref.name} pushes ${formatPct(best.rate)} of games to OT/SO`,
    summary: `${best.ref.name} reaches overtime or shootout ${formatPct(best.rate)} of the time (${best.otGames} of ${best.ref.games} games), ${(Math.abs(best.edge) * 100).toFixed(1)} pts ${best.edge >= 0 ? "above" : "below"} the ${formatPct(leagueOt)} league rate.`,
    explainer: `${otLabel} shows how often games need extra time under this official. Descriptive pace context, not a prediction for tonight's slate.`,
    stats: [
      {
        label: otLabel,
        value: formatPct(best.rate),
        detail: `${best.otGames} OT/SO games`,
      },
      {
        label: "League OT rate",
        value: formatPct(leagueOt),
        detail: "Pool baseline",
      },
      {
        label: `Avg combined ${metricLabels.score}`,
        value: String(best.ref.avgTotalPoints),
        detail: `${formatSigned(best.ref.totalPointsDelta)} vs league`,
      },
    ],
    sampleNote: formatFindingSampleMeta(best.ref.games, stats.meta.seasons),
    links: [{ label: best.ref.name, href: ctx.paths.refPath(best.ref.slug) }],
    score: rankScore(Math.abs(best.edge), best.ref.games, MIN_ANALYTICS_GAMES),
    sampleGames: best.ref.games,
  };
}

const MIN_MARQUEE_FINDING_GAMES = 8;

/** League-wide marquee-vs-baseline efficiency split for Research hub filtering. */
export function buildMarqueeEfficiencyFinding(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
): ScoredFindingBase | null {
  const leagueId = MATRIX_LEAGUE[ctx.league];
  if (!isProVerifiedLiveLeague(leagueId)) {
    return null;
  }

  const scan = scanLeagueMarqueeEfficiency(leagueId, stats.refs);
  if (!scan) return null;

  const { performance, refName, deltaOverPp, deltaAtsPp, marqueeGames } = scan;
  const metricLabels = findingMetricLabels(ctx.league);
  const overPrimary =
    Math.abs(deltaOverPp) >= Math.abs(deltaAtsPp ?? 0);
  const primaryDelta = overPrimary ? deltaOverPp : (deltaAtsPp ?? deltaOverPp);
  const primaryLean = primaryDelta >= 0 ? "higher" : "lower";
  const foulDelta = performance.marqueeAvgFouls - performance.baselineAvgFouls;

  const headline = overPrimary
    ? `${refName} runs ${primaryLean} on overs in marquee games`
    : `${refName} shifts ATS cover rate in marquee games`;

  const summary = overPrimary
    ? `Prime-time and high-profile slate: ${formatPct(performance.marqueeOverRate)} over rate (${marqueeGames} games) vs ${formatPct(performance.baselineOverRate)} baseline, ${formatSigned(deltaOverPp)} pts.`
    : `Marquee slate ATS cover ${formatPct(performance.marqueeAtsCoverRate ?? 0)} vs ${formatPct(performance.baselineAtsCoverRate ?? 0)} baseline (${formatSigned(deltaAtsPp ?? 0)} pts) across ${marqueeGames} high-profile games.`;

  const statsCells = [
    {
      label: "Marquee over rate",
      value: formatPct(performance.marqueeOverRate),
      detail: `${marqueeGames} marquee games`,
    },
    {
      label: "Baseline over rate",
      value: formatPct(performance.baselineOverRate),
      detail: `${performance.baselineGames} non-marquee games`,
    },
    {
      label: `Marquee ${metricLabels.whistle}`,
      value: performance.marqueeAvgFouls.toFixed(1),
      detail: `${formatSigned(foulDelta)} vs ${performance.baselineAvgFouls.toFixed(1)} baseline`,
    },
  ];

  if (
    performance.marqueeAtsCoverRate !== null &&
    performance.baselineAtsCoverRate !== null
  ) {
    statsCells.push({
      label: "Marquee ATS cover",
      value: formatPct(performance.marqueeAtsCoverRate),
      detail: `${formatSigned(deltaAtsPp ?? 0)} pts vs baseline`,
    });
  }

  const explainer =
    performance.marqueeGames >= MARQUEE_CI_MIN_GAMES && performance.overRateCi
      ? `Marquee games flagged by objective metadata: national windows, derbies, top-table clashes, and max-capacity venues. Marquee over-rate 95% CI: ${performance.overRateCi.label}. Descriptive split only.`
      : "Marquee games flagged by objective metadata: national windows, derbies, top-table clashes, and max-capacity venues. Descriptive split only, not a betting signal.";

  return {
    id: `${ctx.paths.idPrefix}marquee-efficiency`,
    category: "marquee-efficiency",
    headline,
    summary,
    explainer,
    stats: statsCells.slice(0, 3),
    sampleNote: formatFindingSampleMeta(marqueeGames, stats.meta.seasons),
    links: [{ label: refName, href: ctx.paths.refPath(scan.refSlug) }],
    score: rankScore(
      Math.abs(primaryDelta) / 100,
      marqueeGames,
      MIN_MARQUEE_FINDING_GAMES,
    ),
    sampleGames: marqueeGames,
  };
}

function frictionFindingCategory(
  finding: FrictionGrudgeFinding,
): "coach-friction" | "player-friction" {
  return finding.personnelType === "coach" ? "coach-friction" : "player-friction";
}

function frictionFindingToScored(
  finding: FrictionGrudgeFinding,
  ctx: LeagueFindingContext,
): ScoredFindingBase {
  return {
    id: `${ctx.paths.idPrefix}${finding.id}`,
    category: frictionFindingCategory(finding),
    headline: finding.headline,
    summary: finding.summary,
    explainer: finding.comparativeLine,
    stats: [
      {
        label: finding.pillLabel,
        value: finding.metricValue,
        detail: finding.deltaLabel,
      },
      {
        label: "Baseline",
        value: finding.baselineValue,
        detail: `${finding.games} head-to-head games`,
      },
      {
        label: "Personnel",
        value: finding.subjectName,
        detail: finding.teamAbbr,
      },
    ],
    sampleNote: formatFindingSampleMeta(finding.games, []),
    links: [
      { label: finding.refName, href: ctx.paths.refPath(finding.refSlug) },
    ],
    score: rankScore(finding.severity / 100, finding.games, FRICTION_MIN_H2H_GAMES),
    sampleGames: finding.games,
  };
}

/** Convert friction matrix outliers into Research findings. */
export function buildFrictionGrudgeFindings(
  stats: RefStatsFile,
  ctx: LeagueFindingContext,
  leagueId: LeagueId,
): ScoredFindingBase[] {
  const matrix = scanFrictionGrudgeMatrix(leagueId, stats);
  return matrix.map((finding) => frictionFindingToScored(finding, ctx));
}
