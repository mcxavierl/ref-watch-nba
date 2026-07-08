import { formatPct, formatSigned, getRefStats, getTeamSplits } from "@/lib/cbb/data";
import { formatPctFromWlp } from "@/lib/ref-betting";
import { getTeam, teamFullName, CBB_TEAMS } from "@/lib/cbb/teams";
import type { Finding, ScoredFindingBase } from "@/lib/findings-shared";
import { rankScore } from "@/lib/findings-shared";
import { pickFeaturedFindings, rankScoredFindings } from "@/lib/findings-significance";
import {
  buildCloseGameLeagueFinding,
  buildCrewDominanceFinding,
  buildLeagueSkewFinding,
  buildMatrixExtremeFinding,
  buildOverRateOutlierFinding,
  buildTeamHomeRoadFinding,
  buildWhistleOutlierFinding,
  buildYoYTrendFinding,
  type LeagueFindingContext,
} from "@/lib/findings-builders";
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
    id: "cbb-team-crew-anomaly",
    category: "team-crew",
    headline: `${teamName} ${lean}s with this crew ${(best.delta * 100).toFixed(0)} pts off neutral`,
    summary: `${crewLabel}${best.split.crewNames.length > 2 ? "…" : ""} on ${teamName}: ${formatPct(best.split.overRate)} over ${baseline} goals (${best.split.games} games).`,
    stats: [
      {
        label: "Over benchmark",
        value: formatPct(best.split.overRate),
        detail: `${best.split.games} games`,
      },
      {
        label: "Avg goals",
        value: String(best.split.avgTotalPoints),
        detail: `vs ${stats.meta.leagueAvgTotal} league avg`,
      },
      {
        label: "PIM total",
        value: String(best.split.avgFouls),
        detail: "Both teams combined",
      },
    ],
    sampleNote: `Min ${MIN_TEAM_CREW_GAMES} games per crew · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: teamName, href: `/cbb/teams/${best.team}` }],
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
    id: "cbb-ou-ats-edge",
    category: "ou-edge",
    headline: `${best.ref.name} leans ${lean} vs closing goal totals`,
    summary: `Totals go ${lean} ${formatPctFromWlp(record.wins, record.losses, record.pushes)} (${formatWlpShort(record)}) across ${best.games} lined games.`,
    explainer: `O/U ATS uses estimated closing totals where sportsbook data is unavailable. Min ${MIN_OU_ATS_GAMES} decisive games required.`,
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
    sampleNote: `${best.games} O/U decisions · estimated closing lines where needed · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: best.ref.name, href: `/cbb/refs/${best.ref.slug}` }],
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
    id: "cbb-ats-outlier",
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
    sampleNote: `${best.games} ATS decisions · estimated closing lines where needed · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: best.ref.name, href: `/cbb/refs/${best.ref.slug}` }],
    score: rankScore(best.edge, best.games, MIN_ATS_GAMES),
    sampleGames: best.games,
  };
}

function scoringExtremesFinding(stats: RefStatsFile): ScoredFindingBase | null {
  let hottest:
    | { ref: RefProfile; team: string; avgTotal: number; games: number }
    | undefined;
  let coldest:
    | { ref: RefProfile; team: string; avgTotal: number; games: number }
    | undefined;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    for (const [team, st] of Object.entries(ref.teamStats)) {
      if (st.games < MIN_TEAM_GAMES) continue;
      if (!hottest || st.avgTotalPoints > hottest.avgTotal) {
        hottest = { ref, team, avgTotal: st.avgTotalPoints, games: st.games };
      }
      if (!coldest || st.avgTotalPoints < coldest.avgTotal) {
        coldest = { ref, team, avgTotal: st.avgTotalPoints, games: st.games };
      }
    }
  }

  if (!hottest || !coldest) return null;

  const gap = hottest.avgTotal - coldest.avgTotal;
  const hotName = getTeam(hottest.team)
    ? teamFullName(getTeam(hottest.team)!)
    : hottest.team;
  const coldName = getTeam(coldest.team)
    ? teamFullName(getTeam(coldest.team)!)
    : coldest.team;

  return {
    id: "cbb-scoring-extremes",
    category: "scoring-extreme",
    headline: `${gap.toFixed(1)}-goal spread between hottest and coldest ref–team pairs`,
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
    sampleNote: `Min ${MIN_TEAM_GAMES} games per pair · ${stats.meta.seasons.join(", ")}`,
    links: [
      { label: hottest.ref.name, href: `/cbb/refs/${hottest.ref.slug}` },
      { label: hotName, href: `/cbb/teams/${hottest.team}` },
    ],
    score: rankScore(gap / stats.meta.leagueAvgTotal, hottest.games + coldest.games, MIN_TEAM_GAMES * 2),
    sampleGames: hottest.games + coldest.games,
  };
}

const CBB_FINDING_CTX: LeagueFindingContext = {
  league: "CBB",
  paths: {
    idPrefix: "cbb-",
    refsBrowsePath: "/cbb/refs",
    refPath: (slug) => `/cbb/refs/${slug}`,
    teamPath: (abbr) => `/cbb/teams/${abbr}`,
    matrixPath: "/cbb/matrix",
    crewsPath: "/cbb/crews",
    trendsPath: "/cbb/trends",
  },
  labels: {
    scoreUnit: "goals",
    whistleUnit: "PIM",
    teamName: (abbr) => {
      const team = getTeam(abbr);
      return team ? teamFullName(team) : abbr;
    },
  },
  getTeamSplits,
  teams: CBB_TEAMS.map((team) => ({
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
    id: "cbb-scoring-outlier",
    category: "ref-outlier",
    headline: `${ref.name} runs ${formatSigned(ref.totalPointsDelta)} on combined scoring`,
    summary: `${ref.name}'s ${ref.games} games average ${ref.avgTotalPoints} combined goals (${formatPct(ref.overRate)} over ${stats.meta.leagueOverBaseline}), one of the largest scoring deltas in the pool.`,
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
        label: "Avg PIM",
        value: String(ref.avgFouls),
        detail: `${formatSigned(ref.foulsDelta)} vs league`,
      },
    ],
    sampleNote: `${MIN_REF_GAMES}+ game sample · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: ref.name, href: `/cbb/refs/${ref.slug}` }],
    score: rankScore(effect, ref.games, MIN_REF_GAMES),
    sampleGames: ref.games,
  };
}

function collectCandidates(stats: RefStatsFile): ScoredFindingBase[] {
  return [
    buildLeagueSkewFinding(stats, CBB_FINDING_CTX),
    teamCrewAnomalyFinding(stats),
    ouAtsEdgeFinding(stats),
    atsOutlierFinding(stats),
    scoringExtremesFinding(stats),
    buildMatrixExtremeFinding(stats, CBB_FINDING_CTX, "high"),
    buildMatrixExtremeFinding(stats, CBB_FINDING_CTX, "low"),
    buildCrewDominanceFinding(stats, CBB_FINDING_CTX),
    buildYoYTrendFinding(stats, CBB_FINDING_CTX),
    buildTeamHomeRoadFinding(stats, CBB_FINDING_CTX),
    buildCloseGameLeagueFinding(stats, CBB_FINDING_CTX),
    buildWhistleOutlierFinding(stats, CBB_FINDING_CTX),
    buildOverRateOutlierFinding(stats, CBB_FINDING_CTX, "low"),
    scoringOutlierFinding(stats),
  ].filter((c): c is ScoredFindingBase => c !== null);
}

export function computeFindings(limit = 6): Finding[] {
  const stats = getRefStats();
  if (stats.refs.length === 0) return [];

  const ranked = rankScoredFindings(collectCandidates(stats));
  return pickFeaturedFindings(ranked, limit);
}

export function computeAllFindings(): Finding[] {
  const stats = getRefStats();
  if (stats.refs.length === 0) return [];

  return rankScoredFindings(collectCandidates(stats))
    .map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip scoring fields
      const { score, sampleGames, ...finding } = item;
      return finding;
    });
}
