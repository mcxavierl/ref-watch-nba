import { formatPct, getRefStats } from "@/lib/nhl/data";
import { formatPctFromWlp } from "@/lib/ref-betting";
import { getTeam, teamFullName } from "@/lib/nhl/teams";
import type { Finding, ScoredFindingBase } from "@/lib/findings-shared";
import { dedupeFindingsByCategory, rankScore } from "@/lib/findings-shared";
import type { RefProfile, RefStatsFile, TeamCrewSplit, WlpRecord } from "@/lib/types";

export type { Finding, FindingCategory } from "@/lib/findings-shared";
export { FINDING_CATEGORY_LABELS } from "@/lib/findings-shared";

const MIN_REF_GAMES = 50;
const MIN_TEAM_GAMES = 8;
const MIN_TEAM_CREW_GAMES = 12;
const MIN_ATS_GAMES = 30;
const MIN_OU_ATS_GAMES = 30;
const MIN_ANALYTICS_GAMES = 30;

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

function leagueUnderFinding(stats: RefStatsFile): ScoredFindingBase {
  const { refs, meta } = stats;
  const underCount = refs.filter((r) => r.overRate < 0.5).length;
  const overCount = refs.filter((r) => r.overRate > 0.5).length;
  const totalGames =
    meta.totalGamesProcessed ?? refs.reduce((sum, r) => sum + r.games, 0);
  const weightedOver =
    refs.reduce((sum, r) => sum + r.overRate * r.games, 0) /
    refs.reduce((sum, r) => sum + r.games, 0);
  const underPct = Math.round((underCount / refs.length) * 100);
  const effectSize = 0.5 - weightedOver;

  return {
    id: "nhl-league-under-bias",
    category: "league-trend",
    headline: "NHL games lean under the goal benchmark",
    summary: `${underCount} of ${refs.length} officials (${underPct}%) trend under ${meta.leagueOverBaseline} combined goals more often than over. Only ${overCount} refs run the other way.`,
    explainer: `League-wide over rate is ${formatPct(weightedOver)} (games-weighted). In a neutral coin-flip world you'd expect ~50%; this sample tilts toward unders on totals.`,
    stats: [
      {
        label: "Refs trending under",
        value: `${underCount}/${refs.length}`,
        detail: `${underPct}% of pool`,
      },
      {
        label: "Games over benchmark",
        value: formatPct(weightedOver),
        detail: "Games-weighted · 50% = neutral",
      },
      {
        label: "Games analyzed",
        value: totalGames.toLocaleString(),
        detail: meta.seasons.join(", "),
      },
    ],
    sampleNote: `${refs.length} refs · ${totalGames.toLocaleString()} games · ${meta.source} data`,
    links: [{ label: "Browse NHL refs", href: "/nhl/refs" }],
    score: rankScore(effectSize, totalGames, MIN_REF_GAMES),
    sampleGames: totalGames,
  };
}

function otRateOutlierFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const leagueOt = stats.meta.leagueOvertimeRate ?? 0.11;
  let best:
    | { ref: RefProfile; rate: number; otGames: number; edge: number }
    | undefined;

  for (const ref of stats.refs) {
    const analytics = ref.nhlAnalytics;
    if (!analytics || ref.games < MIN_ANALYTICS_GAMES) continue;
    const edge = analytics.overtimeRate - leagueOt;
    if (Math.abs(edge) < 0.04) continue;
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
    id: "nhl-ot-outlier",
    category: "ref-outlier",
    headline: `${best.ref.name} pushes ${formatPct(best.rate)} of games to OT/SO`,
    summary: `${best.ref.name} reaches overtime or shootout ${formatPct(best.rate)} of the time (${best.otGames} of ${best.ref.games} games) — ${(Math.abs(best.edge) * 100).toFixed(1)} pts ${best.edge >= 0 ? "above" : "below"} the ${formatPct(leagueOt)} league rate.`,
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
    links: [{ label: best.ref.name, href: `/nhl/refs/${best.ref.slug}` }],
    score: rankScore(best.edge, best.ref.games, MIN_ANALYTICS_GAMES),
    sampleGames: best.ref.games,
  };
}

function penaltyBalanceFinding(stats: RefStatsFile): ScoredFindingBase | null {
  let best:
    | { ref: RefProfile; imbalance: number; balancedRate: number }
    | undefined;

  for (const ref of stats.refs) {
    const analytics = ref.nhlAnalytics;
    if (!analytics || ref.games < MIN_ANALYTICS_GAMES) continue;
    if (analytics.balanceKind !== "asymmetric") continue;
    if (
      !best ||
      analytics.avgMinorImbalance > best.imbalance
    ) {
      best = {
        ref,
        imbalance: analytics.avgMinorImbalance,
        balancedRate: analytics.balancedGameRate,
      };
    }
  }

  if (!best) return null;

  return {
    id: "nhl-penalty-balance",
    category: "whistle-extreme",
    headline: `${best.ref.name} runs asymmetric penalty minutes`,
    summary: `${best.ref.name} averages ${best.imbalance.toFixed(1)} minors of imbalance between teams per game. Only ${formatPct(best.balancedRate)} of games stay within ±1 minor.`,
    explainer: `Penalty balance is descriptive game-management pattern — not a live makeup alert. Useful for spotting refs who consistently tilt PIM one way.`,
    stats: [
      {
        label: "Avg imbalance",
        value: best.imbalance.toFixed(1),
        detail: "|Home minors − away minors|",
      },
      {
        label: "Balanced games",
        value: formatPct(best.balancedRate),
        detail: "Within ±1 minor",
      },
      {
        label: "Sample",
        value: String(best.ref.games),
        detail: `Min ${MIN_ANALYTICS_GAMES} games`,
      },
    ],
    sampleNote: `${best.ref.games} games · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: best.ref.name, href: `/nhl/refs/${best.ref.slug}` }],
    score: rankScore(best.imbalance / 3, best.ref.games, MIN_ANALYTICS_GAMES),
    sampleGames: best.ref.games,
  };
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
    id: "nhl-team-crew-anomaly",
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
    links: [{ label: teamName, href: `/nhl/teams/${best.team}` }],
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
    if (edge < 0.05 || (!best || edge > best.edge)) {
      best = { ref, rate, games, edge };
    }
  }

  if (!best) return null;

  const record = best.ref.bettingStats!.overUnder.overall;
  const lean = best.rate >= 0.5 ? "overs" : "unders";

  return {
    id: "nhl-ou-ats-edge",
    category: "ou-edge",
    headline: `${best.ref.name} leans ${lean} vs closing goal totals`,
    summary: `Totals go ${lean} ${formatPctFromWlp(record.wins, record.losses, record.pushes)} (${formatWlpShort(record)}) across ${best.games} lined games.`,
    explainer: `O/U ATS uses synthetic closing totals in this seeded dataset. Min ${MIN_OU_ATS_GAMES} decisive games required.`,
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
    sampleNote: `${best.games} O/U decisions · synthetic lines · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: best.ref.name, href: `/nhl/refs/${best.ref.slug}` }],
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
    id: "nhl-ats-outlier",
    category: "ats-edge",
    headline: `Home teams ${direction} ${formatPctFromWlp(record.wins, record.losses, record.pushes)} ATS with ${best.ref.name}`,
    summary: `${formatWlpShort(record)} across ${best.games} lined games — ${(best.edge * 100).toFixed(1)} pts from a neutral 50% split.`,
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
    sampleNote: `${best.games} ATS decisions · synthetic lines · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: best.ref.name, href: `/nhl/refs/${best.ref.slug}` }],
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
    id: "nhl-scoring-extremes",
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
      { label: hottest.ref.name, href: `/nhl/refs/${hottest.ref.slug}` },
      { label: hotName, href: `/nhl/teams/${hottest.team}` },
    ],
    score: rankScore(gap / stats.meta.leagueAvgTotal, hottest.games + coldest.games, MIN_TEAM_GAMES * 2),
    sampleGames: hottest.games + coldest.games,
  };
}

function collectCandidates(stats: RefStatsFile): ScoredFindingBase[] {
  return [
    leagueUnderFinding(stats),
    otRateOutlierFinding(stats),
    penaltyBalanceFinding(stats),
    teamCrewAnomalyFinding(stats),
    ouAtsEdgeFinding(stats),
    atsOutlierFinding(stats),
    scoringExtremesFinding(stats),
  ].filter((c): c is ScoredFindingBase => c !== null);
}

export function computeFindings(limit = 6): Finding[] {
  const stats = getRefStats();
  if (stats.refs.length === 0) return [];

  const ranked = collectCandidates(stats).sort((a, b) => b.score - a.score);
  return dedupeFindingsByCategory(ranked, limit);
}
