import { formatPct, formatSigned, getRefStats, getTeamSplits } from "@/lib/cfb/data";
import { buildScopedRefStats } from "@/lib/scoped-ref-stats";
import { formatPctFromWlp } from "@/lib/ref-betting";
import { getTeam, teamFullName, CFB_TEAMS } from "@/lib/cfb/teams";
import type { Finding, ScoredFindingBase } from "@/lib/findings-shared";
import { collectRefTeamScoringExtremes, rankScore } from "@/lib/findings-shared";
import { pickFeaturedFindings, rankScoredFindings } from "@/lib/findings-significance";
import { attachRegionalContextToFindings } from "@/lib/regional-context";
import {
  buildCloseGameLeagueFinding,
  buildLeagueSkewFinding,
  buildMatrixExtremeFinding,
  
  
  buildOverRateOutlierFinding,
  buildTeamHomeRoadFinding,
  buildWhistleOutlierFinding,
  buildYoYTrendFinding,
  type LeagueFindingContext,
} from "@/lib/findings-builders";
import { isNflFlagsOutlier } from "@/lib/findings-significance";
import {
  formatFindingSampleMeta,
  ouLeanHeadline,
  overBenchmarkStatLabel,
  teamCrewLeanHeadline,
  whistlePaceHeadline,
} from "@/lib/finding-copy";
import { getBaselinesFile } from "@/lib/baselines";
import { seasonRowsFromBaselines } from "@/lib/trends";
import type { RefProfile, RefStatsFile, TeamCrewSplit, WlpRecord } from "@/lib/types";

export type { Finding, FindingCategory } from "@/lib/findings-shared";
export { FINDING_CATEGORY_LABELS } from "@/lib/findings-shared";

const MIN_REF_GAMES = 50;
const MIN_TEAM_GAMES = 8;
const MIN_TEAM_CREW_GAMES = 12;
const MIN_ATS_GAMES = 30;
const MIN_OU_ATS_GAMES = 30;

function wlpDecisive(record: WlpRecord): number {
  return record.wins + record.losses;
}

function wlpWinRate(record: WlpRecord): number | null {
  const n = wlpDecisive(record);
  if (n === 0) return null;
  return record.wins / n;
}

function formatWlpShort(record: WlpRecord): string {
  if (record.pushes > 0) return `${record.wins}-${record.losses}-${record.pushes}`;
  return `${record.wins}-${record.losses}`;
}

function teamCrewAnomalyFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const baseline = stats.meta.leagueOverBaseline;
  let best:
    | { team: string; split: TeamCrewSplit; delta: number }
    | undefined;

  for (const [team, splits] of Object.entries(stats.teamSplits)) {
    for (const split of splits) {
      if (split.games < MIN_TEAM_CREW_GAMES) continue;
      const delta = Math.abs(split.overRate - 0.5);
      if (delta < 0.12) continue;
      if (!best || delta > best.delta) {
        best = { team, split, delta };
      }
    }
  }

  if (!best) return null;

  const teamName = getTeam(best.team)
    ? teamFullName(getTeam(best.team)!)
    : best.team;
  const lean = best.split.overRate >= 0.5 ? "over" : "under";
  const crewLabel = best.split.crewNames.slice(0, 2).join(", ");

  return {
    id: "cfb-team-crew-anomaly",
    category: "team-crew",
    headline: teamCrewLeanHeadline(teamName, best.split.overRate, best.delta),
    summary: `${crewLabel}${best.split.crewNames.length > 2 ? "…" : ""} on ${teamName}: ${formatPct(best.split.overRate)} over ${baseline} points (${best.split.games} games).`,
    stats: [
      {
        label: "Over benchmark",
        value: formatPct(best.split.overRate),
        detail: `${best.split.games} games`,
      },
      {
        label: "Avg points",
        value: String(best.split.avgTotalPoints),
        detail: `vs ${stats.meta.leagueAvgTotal} league avg`,
      },
      {
        label: "Flags total",
        value: String(best.split.avgFouls),
        detail: "Both teams combined",
      },
    ],
    sampleNote: formatFindingSampleMeta(best.split.games, stats.meta.seasons),
    links: [{ label: teamName, href: `/cfb/teams/${best.team}` }],
    score: rankScore(best.delta, best.split.games, MIN_TEAM_CREW_GAMES),
    sampleGames: best.split.games,
  };
}

function ouAtsEdgeFinding(stats: RefStatsFile): ScoredFindingBase | null {
  if (!stats.meta.atsAvailable) return null;

  let best:
    | { ref: RefProfile; rate: number; games: number; edge: number }
    | undefined;

  for (const ref of stats.refs) {
    const betting = ref.bettingStats;
    if (!betting?.linesAvailable) continue;
    const record = betting.overUnder.overall;
    const games = wlpDecisive(record);
    if (games < MIN_OU_ATS_GAMES) continue;
    const rate = wlpWinRate(record);
    if (rate === null) continue;
    const edge = Math.abs(rate - 0.5);
    if (edge < 0.05) continue;
    if (!best || edge > best.edge) {
      best = { ref, rate, games, edge };
    }
  }

  if (!best) return null;

  const record = best.ref.bettingStats!.overUnder.overall;
  const lean = best.rate >= 0.5 ? "overs" : "unders";

  return {
    id: "cfb-ou-ats-edge",
    category: "ou-edge",
    headline: ouLeanHeadline(best.ref.name, best.rate, "point totals"),
    summary: `Totals go ${lean} ${formatPctFromWlp(record.wins, record.losses, record.pushes)} (${formatWlpShort(record)}) across ${best.games} lined games.`,
    explainer: `O/U ATS uses ESPN pickcenter or estimated closing totals where sportsbook data is unavailable. Min ${MIN_OU_ATS_GAMES} decisive games required.`,
    stats: [
      {
        label: "O/U ATS",
        value: formatWlpShort(record),
        detail: formatPctFromWlp(record.wins, record.losses, record.pushes),
      },
      {
        label: "Sample",
        value: String(best.games),
        detail: `Min ${MIN_OU_ATS_GAMES} games`,
      },
      {
        label: "Edge vs 50%",
        value: `${(best.edge * 100).toFixed(1)} pts`,
        detail: `Leans ${lean}`,
      },
    ],
    sampleNote: formatFindingSampleMeta(best.games, stats.meta.seasons),
    links: [{ label: best.ref.name, href: `/cfb/refs/${best.ref.slug}` }],
    score: rankScore(best.edge, best.games, MIN_OU_ATS_GAMES),
    sampleGames: best.games,
  };
}

function atsOutlierFinding(stats: RefStatsFile): ScoredFindingBase | null {
  if (!stats.meta.atsAvailable) return null;

  let best:
    | { ref: RefProfile; coverRate: number; games: number; edge: number }
    | undefined;

  for (const ref of stats.refs) {
    const betting = ref.bettingStats;
    if (!betting?.linesAvailable) continue;
    const record = betting.homeTeamAts;
    const games = wlpDecisive(record);
    if (games < MIN_ATS_GAMES) continue;
    const coverRate = wlpWinRate(record);
    if (coverRate === null) continue;
    const edge = Math.abs(coverRate - 0.5);
    if (edge < 0.05 || (!best || edge > best.edge)) {
      best = { ref, coverRate, games, edge };
    }
  }

  if (!best) return null;

  const record = best.ref.bettingStats!.homeTeamAts;
  const direction = best.coverRate >= 0.5 ? "cover" : "fail to cover";

  return {
    id: "cfb-ats-outlier",
    category: "ats-edge",
    headline: `Home teams ${direction} ${formatPctFromWlp(record.wins, record.losses, record.pushes)} ATS with ${best.ref.name}`,
    summary: `${formatWlpShort(record)} across ${best.games} lined games, ${(best.edge * 100).toFixed(1)} pts from a neutral 50% split.`,
    stats: [
      {
        label: "Home ATS",
        value: formatWlpShort(record),
        detail: formatPctFromWlp(record.wins, record.losses, record.pushes),
      },
      {
        label: "Sample",
        value: String(best.games),
        detail: `Min ${MIN_ATS_GAMES} games`,
      },
      {
        label: "Edge vs 50%",
        value: `${(best.edge * 100).toFixed(1)} pts`,
        detail: "Absolute deviation",
      },
    ],
    sampleNote: formatFindingSampleMeta(best.games, stats.meta.seasons),
    links: [{ label: best.ref.name, href: `/cfb/refs/${best.ref.slug}` }],
    score: rankScore(best.edge, best.games, MIN_ATS_GAMES),
    sampleGames: best.games,
  };
}

function scoringExtremesFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const extremes = collectRefTeamScoringExtremes(stats, MIN_TEAM_GAMES);
  if (!extremes) return null;
  const { hottest, coldest } = extremes;

  const gap = hottest.avgTotal - coldest.avgTotal;
  const hotName = getTeam(hottest.team)
    ? teamFullName(getTeam(hottest.team)!)
    : hottest.team;
  const coldName = getTeam(coldest.team)
    ? teamFullName(getTeam(coldest.team)!)
    : coldest.team;

  return {
    id: "cfb-scoring-extremes",
    category: "scoring-extreme",
    headline: `${gap.toFixed(1)}-point spread between hottest and coldest ref–team pairs`,
    summary: `Highest: ${hottest.ref.name} on ${hotName} (${hottest.avgTotal} avg). Lowest: ${coldest.ref.name} on ${coldName} (${coldest.avgTotal} avg).`,
    stats: [
      {
        label: "Hottest avg",
        value: String(hottest.avgTotal),
        detail: `${hottest.ref.name} · ${hottest.team}`,
      },
      {
        label: "Coldest avg",
        value: String(coldest.avgTotal),
        detail: `${coldest.ref.name} · ${coldest.team}`,
      },
      {
        label: "Gap",
        value: gap.toFixed(1),
        detail: `vs ${stats.meta.leagueAvgTotal} league avg`,
      },
    ],
    sampleNote: formatFindingSampleMeta(
      hottest.games + coldest.games,
      stats.meta.seasons,
    ),
    links: [
      { label: hottest.ref.name, href: `/cfb/refs/${hottest.ref.slug}` },
      { label: hotName, href: `/cfb/teams/${hottest.team}` },
    ],
    score: rankScore(gap / stats.meta.leagueAvgTotal, hottest.games + coldest.games, MIN_TEAM_GAMES * 2),
    sampleGames: hottest.games + coldest.games,
  };
}

function cfbBaselineSeasonRows() {
  const block = getBaselinesFile().CFB;
  if (block.usingFallback || block.aggregate.gameCount === 0) return null;
  const rows = seasonRowsFromBaselines(block.seasons);
  return rows.length >= 2 ? rows : null;
}

function cfbScoringDeclineFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const rows = cfbBaselineSeasonRows();
  if (!rows) return null;
  const earliest = rows[0];
  const latest = rows[rows.length - 1];
  const delta = latest.leagueAvgTotal - earliest.leagueAvgTotal;
  if (delta >= -2) return null;

  return {
    id: "cfb-scoring-decline",
    category: "league-trend",
    headline: `CFB combined scoring down ${Math.abs(delta).toFixed(1)} points since ${earliest.season}`,
    summary: `League average fell from ${earliest.leagueAvgTotal.toFixed(1)} points in ${earliest.season} to ${latest.leagueAvgTotal.toFixed(1)} in ${latest.season} across live-conference games.`,
    explainer: "Season baselines from verified ESPN game logs. Descriptive league trend, not a forecast.",
    stats: [
      {
        label: `${earliest.season} avg`,
        value: earliest.leagueAvgTotal.toFixed(1),
        detail: `${earliest.gameCount.toLocaleString()} games`,
      },
      {
        label: `${latest.season} avg`,
        value: latest.leagueAvgTotal.toFixed(1),
        detail: `${latest.gameCount.toLocaleString()} games`,
      },
      {
        label: "Multi-year change",
        value: formatSigned(delta),
        detail: "Combined points per game",
      },
    ],
    sampleNote: formatFindingSampleMeta(
      earliest.gameCount + latest.gameCount,
      rows.map((row) => row.season),
    ),
    links: [{ label: "Full trends", href: "/cfb/trends" }],
    score: rankScore(Math.abs(delta) / stats.meta.leagueAvgTotal, latest.gameCount, 200),
    sampleGames: latest.gameCount,
  };
}

function cfbFoulPaceDeclineFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const rows = cfbBaselineSeasonRows();
  if (!rows) return null;
  const earliest = rows[0];
  const latest = rows[rows.length - 1];
  const delta = latest.leagueAvgFouls - earliest.leagueAvgFouls;
  if (delta >= -0.4) return null;

  return {
    id: "cfb-foul-pace-decline",
    category: "league-trend",
    headline: `Penalty flags per game easing across the CFB sample`,
    summary: `Flags dropped from ${earliest.leagueAvgFouls.toFixed(1)} per game (${earliest.season}) to ${latest.leagueAvgFouls.toFixed(1)} (${latest.season}), a ${formatSigned(delta)} change.`,
    explainer: "League-wide whistle pace from game logs. Official-level splits return when crew data is available.",
    stats: [
      {
        label: `${earliest.season} flags`,
        value: earliest.leagueAvgFouls.toFixed(1),
        detail: "Per game",
      },
      {
        label: `${latest.season} flags`,
        value: latest.leagueAvgFouls.toFixed(1),
        detail: "Per game",
      },
      {
        label: "Change",
        value: formatSigned(delta),
        detail: "Flags per game",
      },
    ],
    sampleNote: formatFindingSampleMeta(
      earliest.gameCount + latest.gameCount,
      rows.map((row) => row.season),
    ),
    links: [{ label: "Full trends", href: "/cfb/trends" }],
    score: rankScore(Math.abs(delta) / Math.max(stats.meta.leagueAvgFouls, 1), latest.gameCount, 200),
    sampleGames: latest.gameCount,
  };
}

function cfbPeakScoringSeasonFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const rows = cfbBaselineSeasonRows();
  if (!rows) return null;
  const peak = [...rows].sort((a, b) => b.leagueAvgTotal - a.leagueAvgTotal)[0];
  const recent = rows[rows.length - 1];
  const gap = peak.leagueAvgTotal - recent.leagueAvgTotal;
  if (gap < 3) return null;

  return {
    id: "cfb-peak-scoring-season",
    category: "scoring-extreme",
    headline: `${peak.season} ran hottest in the CFB baseline sample`,
    summary: `${peak.leagueAvgTotal.toFixed(1)} combined points per game across ${peak.gameCount.toLocaleString()} live-conference games, ${gap.toFixed(1)} above the latest season.`,
    stats: [
      {
        label: "Peak season avg",
        value: peak.leagueAvgTotal.toFixed(1),
        detail: peak.season,
      },
      {
        label: "Latest season avg",
        value: recent.leagueAvgTotal.toFixed(1),
        detail: recent.season,
      },
      {
        label: "Gap vs latest",
        value: gap.toFixed(1),
        detail: "Combined points",
      },
    ],
    sampleNote: formatFindingSampleMeta(peak.gameCount, [peak.season]),
    links: [{ label: "Full trends", href: "/cfb/trends" }],
    score: rankScore(gap / stats.meta.leagueAvgTotal, peak.gameCount, 150),
    sampleGames: peak.gameCount,
  };
}

function cfbLowScoringSeasonFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const rows = cfbBaselineSeasonRows();
  if (!rows) return null;
  const low = [...rows].sort((a, b) => a.leagueAvgTotal - b.leagueAvgTotal)[0];
  const high = [...rows].sort((a, b) => b.leagueAvgTotal - a.leagueAvgTotal)[0];
  const spread = high.leagueAvgTotal - low.leagueAvgTotal;
  if (spread < 4) return null;

  return {
    id: "cfb-low-scoring-season",
    category: "scoring-extreme",
    headline: `${low.season} was the coldest scoring season in the pool`,
    summary: `${low.leagueAvgTotal.toFixed(1)} combined points per game vs ${high.leagueAvgTotal.toFixed(1)} in ${high.season}, a ${spread.toFixed(1)}-point spread across seasons.`,
    stats: [
      {
        label: "Coldest season",
        value: low.leagueAvgTotal.toFixed(1),
        detail: low.season,
      },
      {
        label: "Hottest season",
        value: high.leagueAvgTotal.toFixed(1),
        detail: high.season,
      },
      {
        label: "Season spread",
        value: spread.toFixed(1),
        detail: "Combined points",
      },
    ],
    sampleNote: formatFindingSampleMeta(low.gameCount + high.gameCount, rows.map((row) => row.season)),
    links: [{ label: "Full trends", href: "/cfb/trends" }],
    score: rankScore(spread / stats.meta.leagueAvgTotal, low.gameCount + high.gameCount, 200),
    sampleGames: low.gameCount + high.gameCount,
  };
}

function cfbSampleVolumeFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const rows = cfbBaselineSeasonRows();
  if (!rows) return null;
  const totalGames = rows.reduce((sum, row) => sum + row.gameCount, 0);
  if (totalGames < 500) return null;
  const latest = rows[rows.length - 1];

  return {
    id: "cfb-sample-volume",
    category: "league-trend",
    headline: `${totalGames.toLocaleString()} live-conference games in the CFB baseline pool`,
    summary: `${rows.length} seasons tracked through ${latest.season}, spanning power-conference schedules before official crew backfill ships.`,
    explainer: "Game-level scores and penalties are live. Ref-level findings populate when ESPN crew assignments are available.",
    stats: [
      {
        label: "Total games",
        value: totalGames.toLocaleString(),
        detail: `${rows.length} seasons`,
      },
      {
        label: "Latest season",
        value: latest.leagueAvgTotal.toFixed(1),
        detail: `${latest.gameCount.toLocaleString()} games`,
      },
      {
        label: "League benchmark",
        value: String(stats.meta.leagueOverBaseline),
        detail: "Combined points proxy",
      },
    ],
    sampleNote: formatFindingSampleMeta(totalGames, rows.map((row) => row.season)),
    links: [{ label: "Full trends", href: "/cfb/trends" }],
    score: rankScore(totalGames / 5000, totalGames, 400),
    sampleGames: totalGames,
  };
}

const CFB_FINDING_CTX: LeagueFindingContext = {
  league: "CFB",
  paths: {
    idPrefix: "cfb-",
    refsBrowsePath: "/cfb/refs",
    refPath: (slug) => `/cfb/refs/${slug}`,
    teamPath: (abbr) => `/cfb/teams/${abbr}`,
    matrixPath: "/cfb/matrix",
    crewsPath: "/cfb/crews",
    trendsPath: "/cfb/trends",
  },
  labels: {
    scoreUnit: "points",
    whistleUnit: "flags",
    teamName: (abbr) => {
      const team = getTeam(abbr);
      return team ? teamFullName(team) : abbr;
    },
  },
  getTeamSplits,
  teams: CFB_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: teamFullName(team),
    name: team.name,
  })),
};

function scoringOutlierFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const qualified = stats.refs.filter((r) => r.games >= MIN_REF_GAMES);
  if (qualified.length === 0) return null;

  const ref = [...qualified].sort(
    (a, b) => Math.abs(b.totalPointsDelta) - Math.abs(a.totalPointsDelta),
  )[0];
  if (Math.abs(ref.totalPointsDelta) < 0.08) return null;
  const effect = ref.totalPointsDelta / stats.meta.leagueAvgTotal;

  return {
    id: "cfb-scoring-outlier",
    category: "ref-outlier",
    headline: `${ref.name} runs ${formatSigned(ref.totalPointsDelta)} on combined scoring`,
    summary: `${ref.name}'s ${ref.games} games average ${ref.avgTotalPoints} combined points (${formatPct(ref.overRate)} over ${stats.meta.leagueOverBaseline}), one of the largest scoring deltas in the pool.`,
    stats: [
      {
        label: "Scoring delta",
        value: formatSigned(ref.totalPointsDelta),
        detail: `vs ${stats.meta.leagueAvgTotal} league avg`,
      },
      {
        label: "Over benchmark",
        value: formatPct(ref.overRate),
        detail: `${ref.games} games`,
      },
      {
        label: "Avg flags",
        value: String(ref.avgFouls),
        detail: `${formatSigned(ref.foulsDelta)} vs league`,
      },
    ],
    sampleNote: formatFindingSampleMeta(ref.games, stats.meta.seasons),
    links: [{ label: ref.name, href: `/cfb/refs/${ref.slug}` }],
    score: rankScore(effect, ref.games, MIN_REF_GAMES),
    sampleGames: ref.games,
  };
}


function buildNflFlagsOutlierFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const leagueAvg = stats.meta.leagueAvgFouls;
  let best: RefProfile | undefined;
  for (const ref of stats.refs) {
    const a = ref.cfbAnalytics;
    if (!a || !isNflFlagsOutlier(a.avgFlagsPerGame, leagueAvg, ref.games)) continue;
    if (
      !best ||
      Math.abs(a.flagsDelta) > Math.abs(best.cfbAnalytics?.flagsDelta ?? 0)
    ) {
      best = ref;
    }
  }
  if (!best?.cfbAnalytics) return null;
  const a = best.cfbAnalytics;
  const flagsDelta = a.flagsDelta;

  return {
    id: "cfb-flags-outlier",
    category: "whistle-extreme",
    headline: whistlePaceHeadline(best.name, flagsDelta, "flags", best.overRate),
    summary: `${best.name} averages ${a.avgFlagsPerGame.toFixed(1)} flags per game (${formatSigned(flagsDelta)} vs the ${leagueAvg.toFixed(1)} league average) across ${best.games} assigned games, one of the clearest penalty-volume outliers in the CFB pool.`,
    explainer:
      "Flag pace compares how often a crew throws penalty flags relative to the league average in this dataset. Heavier or lighter flag volume is descriptive officiating style; it does not, by itself, predict spreads, totals, or game outcomes.",
    stats: [
      {
        label: "Flags per game",
        value: a.avgFlagsPerGame.toFixed(1),
        detail: `${formatSigned(flagsDelta)} vs ${leagueAvg.toFixed(1)} league avg`,
      },
      {
        label: overBenchmarkStatLabel(best.overRate),
        value: formatPct(best.overRate),
        detail: `${stats.meta.leagueOverBaseline} combined points`,
      },
      {
        label: "Scoring delta",
        value: formatSigned(best.totalPointsDelta),
        detail: `vs ${stats.meta.leagueAvgTotal} league avg`,
      },
    ],
    sampleNote: formatFindingSampleMeta(best.games, stats.meta.seasons),
    links: [{ label: best.name, href: `/cfb/refs/${best.slug}` }],
    score: rankScore(
      Math.abs(flagsDelta) / Math.max(leagueAvg, 1),
      best.games,
      MIN_REF_GAMES,
    ),
    sampleGames: best.games,
  };
}
function collectCandidates(
  stats: RefStatsFile,
  options?: { hub?: boolean },
): ScoredFindingBase[] {
  const includeHeavy = !options?.hub;
  return [
    buildNflFlagsOutlierFinding(stats),
    cfbScoringDeclineFinding(stats),
    cfbFoulPaceDeclineFinding(stats),
    cfbPeakScoringSeasonFinding(stats),
    cfbLowScoringSeasonFinding(stats),
    cfbSampleVolumeFinding(stats),
    ...(options?.hub ? [] : [buildLeagueSkewFinding(stats, CFB_FINDING_CTX)]),
    ouAtsEdgeFinding(stats),
    atsOutlierFinding(stats),
    buildYoYTrendFinding(stats, CFB_FINDING_CTX),
    buildWhistleOutlierFinding(stats, CFB_FINDING_CTX),
    buildOverRateOutlierFinding(stats, CFB_FINDING_CTX, "low"),
    scoringOutlierFinding(stats),
    ...(includeHeavy
      ? [
          teamCrewAnomalyFinding(stats),
          scoringExtremesFinding(stats),
          buildMatrixExtremeFinding(stats, CFB_FINDING_CTX, "high"),
          buildMatrixExtremeFinding(stats, CFB_FINDING_CTX, "low"),
          buildCloseGameLeagueFinding(stats, CFB_FINDING_CTX),
          buildTeamHomeRoadFinding(stats, CFB_FINDING_CTX),
        ]
      : []),
  ].filter((c): c is ScoredFindingBase => c !== null);
}

function resolveStats(scopedSeasons?: string[]) {
  const full = getRefStats();
  if (!scopedSeasons?.length) return full;
  return buildScopedRefStats("cfb", full, scopedSeasons);
}

export function computeFindings(
  limit = 6,
  scopedSeasons?: string[],
  options?: { hub?: boolean },
): Finding[] {
  const stats = resolveStats(scopedSeasons);
  const ranked = rankScoredFindings(collectCandidates(stats, options));
  if (ranked.length === 0) return [];

  return attachRegionalContextToFindings(
    pickFeaturedFindings(ranked, limit),
    stats,
  );
}

export function computeAllFindings(
  scopedSeasons?: string[],
  options?: { hub?: boolean },
): Finding[] {
  const stats = resolveStats(scopedSeasons);
  const ranked = rankScoredFindings(collectCandidates(stats, options));
  if (ranked.length === 0) return [];

  return attachRegionalContextToFindings(
    ranked
      .map((item) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip scoring fields
        const { score, sampleGames, ...finding } = item;
        return finding;
      }),
    stats,
  );
}
