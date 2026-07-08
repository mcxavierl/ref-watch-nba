import { formatPct, getRefStats } from "@/lib/data";
import { buildScopedRefStats } from "@/lib/scoped-ref-stats";
import { formatSigned } from "@/lib/stats-utils";
import { formatPctFromWlp } from "@/lib/ref-betting";
import { getTeam, teamFullName } from "@/lib/teams";
import type {
  Finding,
  ScoredFindingBase,
} from "@/lib/findings-shared";
import {
  FINDING_CATEGORY_LABELS,
  rankScore,
} from "@/lib/findings-shared";
import { pickFeaturedFindings, rankScoredFindings, weightedLeagueOverRate } from "@/lib/findings-significance";
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
import { getTeamSplits } from "@/lib/data";
import { NBA_TEAMS } from "@/lib/teams";

export type { Finding, FindingCategory, FindingLink, FindingStat } from "@/lib/findings-shared";
export { FINDING_CATEGORY_LABELS };

interface RefTeamAggregate {
  team: string;
  games: number;
  winRate: number;
  foulDiff: number;
  overRate: number;
  avgTotal: number;
}

const MIN_REF_GAMES = 50;
const MIN_TEAM_GAMES = 8;
const MIN_TEAM_CREW_GAMES = 12;
const MIN_ATS_GAMES = 30;
const MIN_OU_ATS_GAMES = 30;
const MIN_WHISTLE_GAMES = 100;

function wlpDecisive(record: WlpRecord): number {
  return record.wins + record.losses;
}

function wlpWinRate(record: WlpRecord): number | null {
  const n = wlpDecisive(record);
  if (n === 0) return null;
  return record.wins / n;
}

function rankScoreLocal(effectSize: number, sampleGames: number, minSample: number): number {
  return rankScore(effectSize, sampleGames, minSample);
}

function aggregateRefTeams(
  stats: RefStatsFile,
): Map<string, RefTeamAggregate[]> {
  const byRef = new Map<string, Map<string, RefTeamAggregate>>();

  for (const [team, splits] of Object.entries(stats.teamSplits)) {
    for (const split of splits) {
      for (const slug of split.crewKey.split("|")) {
        let teamMap = byRef.get(slug);
        if (!teamMap) {
          teamMap = new Map();
          byRef.set(slug, teamMap);
        }

        const existing = teamMap.get(team);
        if (existing) {
          const nextGames = existing.games + split.games;
          existing.winRate =
            (existing.winRate * existing.games +
              (split.wins / split.games) * split.games) /
            nextGames;
          existing.foulDiff =
            (existing.foulDiff * existing.games +
              split.foulDifferential * split.games) /
            nextGames;
          existing.overRate =
            (existing.overRate * existing.games + split.overRate * split.games) /
            nextGames;
          existing.avgTotal =
            (existing.avgTotal * existing.games +
              split.avgTotalPoints * split.games) /
            nextGames;
          existing.games = nextGames;
        } else {
          teamMap.set(team, {
            team,
            games: split.games,
            winRate: split.wins / split.games,
            foulDiff: split.foulDifferential,
            overRate: split.overRate,
            avgTotal: split.avgTotalPoints,
          });
        }
      }
    }
  }

  const result = new Map<string, RefTeamAggregate[]>();
  for (const [slug, teamMap] of byRef) {
    result.set(slug, [...teamMap.values()]);
  }
  return result;
}

function leagueUnderFinding(stats: RefStatsFile): ScoredFindingBase | null {
  return buildLeagueSkewFinding(stats, NBA_FINDING_CTX);
}

function rareOverRefsFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const { refs, meta } = stats;
  const overRefs = refs
    .filter((r) => r.games >= MIN_REF_GAMES && r.overRate > 0.5)
    .sort((a, b) => b.overRate - a.overRate);
  const qualified = refs.filter((r) => r.games >= MIN_REF_GAMES);
  if (overRefs.length === 0 || qualified.length === 0) return null;

  const overPct = Math.round((overRefs.length / qualified.length) * 100);
  const headline =
    overPct === 100
      ? `Every high-volume ref leans over the benchmark`
      : `${overPct}% of high-volume refs lean over the benchmark`;

  return {
    id: "rare-over-refs",
    category: "ref-outlier",
    headline,
    summary: `Among officials with ${MIN_REF_GAMES}+ games, ${overRefs.length} of ${qualified.length} beat the ${meta.leagueOverBaseline}-point benchmark in a majority of their own games, not that every game went over.`,
    explainer: `Personal over rate counts how often each ref's games clear the benchmark. League-wide, roughly ${formatPct(weightedLeagueOverRate(qualified))} of games in this pool finished over. The list includes ${overRefs.slice(0, 8).map((r) => r.name).join(", ")}${overRefs.length > 8 ? ` and ${overRefs.length - 8} more` : ""}.`,
    stats: [
      {
        label: "Over refs",
        value: `${overRefs.length}/${qualified.length}`,
        detail: `${MIN_REF_GAMES}+ games each`,
      },
      {
        label: "Top over ref",
        value: formatPct(overRefs[0].overRate),
        detail: `${overRefs[0].name} · ${overRefs[0].games} games`,
      },
      {
        label: "League benchmark",
        value: String(meta.leagueOverBaseline),
        detail: "Combined pts proxy",
      },
    ],
    sampleNote: `${qualified.length} refs with ${MIN_REF_GAMES}+ games · ${meta.seasons.join(", ")}`,
    links: overRefs.slice(0, 3).map((r) => ({
      label: r.name,
      href: `/refs/${r.slug}`,
    })),
    score: rankScoreLocal(
      Math.abs(overRefs.length / qualified.length - 0.5),
      qualified.length,
      20,
    ),
    sampleGames: qualified.length,
  };
}

function overRateTeamSplitFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const minSpread = 0.5;

  let best:
    | {
        ref: RefProfile;
        highTeam: string;
        highOver: number;
        highGames: number;
        lowTeam: string;
        lowOver: number;
        lowGames: number;
        spread: number;
      }
    | undefined;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    const teams = Object.entries(ref.teamStats).filter(
      ([, st]) => st.games >= MIN_TEAM_GAMES,
    );
    if (teams.length < 3) continue;

    const high = teams.reduce((a, b) => (a[1].overRate > b[1].overRate ? a : b));
    const low = teams.reduce((a, b) => (a[1].overRate < b[1].overRate ? a : b));
    const spread = high[1].overRate - low[1].overRate;

    if (spread >= minSpread && (!best || spread > best.spread)) {
      best = {
        ref,
        highTeam: high[0],
        highOver: high[1].overRate,
        highGames: high[1].games,
        lowTeam: low[0],
        lowOver: low[1].overRate,
        lowGames: low[1].games,
        spread,
      };
    }
  }

  if (!best) return null;

  const highName = getTeam(best.highTeam)
    ? teamFullName(getTeam(best.highTeam)!)
    : best.highTeam;
  const lowName = getTeam(best.lowTeam)
    ? teamFullName(getTeam(best.lowTeam)!)
    : best.lowTeam;

  return {
    id: "over-rate-team-split",
    category: "ref-team-split",
    headline: `${best.ref.name}'s over rate swings by opponent`,
    summary: `With ${best.ref.name}, ${formatPct(best.highOver)} of ${highName} games beat ${stats.meta.leagueOverBaseline} combined points, ${lowName} games only ${formatPct(best.lowOver)}.`,
    explainer: `The ${(best.spread * 100).toFixed(0)}-point over-rate gap is historical scoring frequency vs a neutral 50% baseline, not sportsbook pricing.`,
    stats: [
      {
        label: `${best.highTeam} over ${stats.meta.leagueOverBaseline}`,
        value: formatPct(best.highOver),
        detail: `${best.highGames} games`,
      },
      {
        label: `${best.lowTeam} over ${stats.meta.leagueOverBaseline}`,
        value: formatPct(best.lowOver),
        detail: `${best.lowGames} games`,
      },
      {
        label: "Over-rate gap",
        value: `${(best.spread * 100).toFixed(0)} pts`,
        detail: "vs 50% neutral baseline",
      },
    ],
    sampleNote: `Min ${MIN_TEAM_GAMES} games per team · ${stats.meta.seasons.join(", ")}`,
    links: [
      { label: best.ref.name, href: `/refs/${best.ref.slug}` },
      { label: highName, href: `/teams/${best.highTeam}` },
      { label: lowName, href: `/teams/${best.lowTeam}` },
    ],
    score: rankScoreLocal(best.spread, best.highGames + best.lowGames, MIN_TEAM_GAMES * 2),
    sampleGames: best.highGames + best.lowGames,
  };
}

function foulEdgeLosingFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const minFoulEdge = 2.5;
  const maxWinRate = 0.35;

  let best:
    | {
        ref: RefProfile;
        team: string;
        foulDiff: number;
        winRate: number;
        games: number;
        avgTotal: number;
        overRate: number;
      }
    | undefined;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    for (const [team, st] of Object.entries(ref.teamStats)) {
      if (
        st.games >= 15 &&
        st.avgFoulDifferential >= minFoulEdge &&
        st.winRate <= maxWinRate &&
        (!best || st.avgFoulDifferential > best.foulDiff)
      ) {
        best = {
          ref,
          team,
          foulDiff: st.avgFoulDifferential,
          winRate: st.winRate,
          games: st.games,
          avgTotal: st.avgTotalPoints,
          overRate: st.overRate,
        };
      }
    }
  }

  if (!best) return null;

  const teamName = getTeam(best.team)
    ? teamFullName(getTeam(best.team)!)
    : best.team;

  return {
    id: "foul-edge-losing",
    category: "ref-team-split",
    headline: `${best.ref.name} helps ${best.team} on fouls, but they still lose`,
    summary: `With ${best.ref.name} on ${teamName} games, opponents are whistled ${best.foulDiff >= 0 ? "+" : ""}${best.foulDiff.toFixed(1)} more fouls per game. Yet ${teamName} win just ${formatPct(best.winRate)}.`,
    explainer: `Foul edge doesn't always convert to wins or overs. These games average ${best.avgTotal} combined points (${formatPct(best.overRate)} over rate).`,
    stats: [
      {
        label: "Foul edge",
        value: `${best.foulDiff >= 0 ? "+" : ""}${best.foulDiff.toFixed(1)}`,
        detail: `${best.team} vs opponents`,
      },
      {
        label: "Win rate",
        value: formatPct(best.winRate),
        detail: `${best.games} games`,
      },
      {
        label: "Over benchmark",
        value: formatPct(best.overRate),
        detail: `Avg ${best.avgTotal} combined pts`,
      },
    ],
    sampleNote: `${best.games} ${best.team} games · min ${MIN_TEAM_GAMES} game sample`,
    links: [
      { label: best.ref.name, href: `/refs/${best.ref.slug}` },
      { label: teamName, href: `/teams/${best.team}` },
    ],
    score: rankScoreLocal(best.foulDiff * (0.5 - best.winRate), best.games, MIN_TEAM_GAMES),
    sampleGames: best.games,
  };
}

function scoringExtremesFinding(stats: RefStatsFile): ScoredFindingBase | null {
  let hottest:
    | {
        ref: RefProfile;
        team: string;
        avgTotal: number;
        overRate: number;
        games: number;
      }
    | undefined;
  let coldest:
    | {
        ref: RefProfile;
        team: string;
        avgTotal: number;
        overRate: number;
        games: number;
      }
    | undefined;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    for (const [team, st] of Object.entries(ref.teamStats)) {
      if (st.games < MIN_TEAM_GAMES) continue;
      if (!hottest || st.avgTotalPoints > hottest.avgTotal) {
        hottest = {
          ref,
          team,
          avgTotal: st.avgTotalPoints,
          overRate: st.overRate,
          games: st.games,
        };
      }
      if (!coldest || st.avgTotalPoints < coldest.avgTotal) {
        coldest = {
          ref,
          team,
          avgTotal: st.avgTotalPoints,
          overRate: st.overRate,
          games: st.games,
        };
      }
    }
  }

  if (!hottest || !coldest) return null;

  const hotTeam = getTeam(hottest.team)
    ? teamFullName(getTeam(hottest.team)!)
    : hottest.team;
  const coldTeam = getTeam(coldest.team)
    ? teamFullName(getTeam(coldest.team)!)
    : coldest.team;
  const gap = hottest.avgTotal - coldest.avgTotal;

  return {
    id: "scoring-extremes",
    category: "scoring-extreme",
    headline: `${gap.toFixed(1)}-point spread between hottest and coldest ref–team pairs`,
    summary: `Highest: ${hottest.ref.name} on ${hotTeam} (${hottest.avgTotal} avg). Lowest: ${coldest.ref.name} on ${coldTeam} (${coldest.avgTotal} avg).`,
    explainer: `League average is ${stats.meta.leagueAvgTotal}. The hot pair runs ${(hottest.avgTotal - stats.meta.leagueAvgTotal).toFixed(1)} above; the cold pair ${(coldest.avgTotal - stats.meta.leagueAvgTotal).toFixed(1)} below.`,
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
    sampleNote: `Min ${MIN_TEAM_GAMES} games per ref–team pair · ${stats.meta.seasons.join(", ")}`,
    links: [
      { label: hottest.ref.name, href: `/refs/${hottest.ref.slug}` },
      { label: hotTeam, href: `/teams/${hottest.team}` },
      { label: coldest.ref.name, href: `/refs/${coldest.ref.slug}` },
      { label: coldTeam, href: `/teams/${coldest.team}` },
    ],
    score: rankScoreLocal(gap / stats.meta.leagueAvgTotal, hottest.games + coldest.games, MIN_TEAM_GAMES * 2),
    sampleGames: hottest.games + coldest.games,
  };
}

function crossTeamWhistleFinding(
  stats: RefStatsFile,
  refTeams: Map<string, RefTeamAggregate[]>,
): ScoredFindingBase | null {
  const minTeams = 4;

  let best:
    | {
        ref: RefProfile;
        favored: RefTeamAggregate;
        penalized: RefTeamAggregate;
        spread: number;
      }
    | undefined;

  for (const ref of stats.refs) {
    const teams = (refTeams.get(ref.slug) ?? []).filter(
      (t) => t.games >= MIN_TEAM_GAMES,
    );
    if (teams.length < minTeams) continue;

    const favored = [...teams].sort((a, b) => b.foulDiff - a.foulDiff)[0];
    const penalized = [...teams].sort((a, b) => a.foulDiff - b.foulDiff)[0];
    const spread = favored.foulDiff - penalized.foulDiff;

    if (!best || spread > best.spread) {
      best = { ref, favored, penalized, spread };
    }
  }

  if (
    !best ||
    best.spread < 4 ||
    best.favored.games < 10 ||
    best.penalized.games < 10
  ) {
    return null;
  }

  const { ref, favored, penalized, spread: bestSpread } = best;
  const favoredName = getTeam(favored.team)
    ? teamFullName(getTeam(favored.team)!)
    : favored.team;
  const penalizedName = getTeam(penalized.team)
    ? teamFullName(getTeam(penalized.team)!)
    : penalized.team;

  return {
    id: "cross-team-whistle",
    category: "whistle-extreme",
    headline: `${ref.name} whistles differently by team`,
    summary: `${favoredName} draw ${favored.foulDiff >= 0 ? "+" : ""}${favored.foulDiff.toFixed(1)} fouls per game with ${ref.name}; ${penalizedName} see ${penalized.foulDiff.toFixed(1)}, a ${bestSpread.toFixed(1)}-foul swing.`,
    stats: [
      {
        label: `${favored.team} foul edge`,
        value: `${favored.foulDiff >= 0 ? "+" : ""}${favored.foulDiff.toFixed(1)}`,
        detail: `${favored.games} games · ${formatPct(favored.winRate)} wins`,
      },
      {
        label: `${penalized.team} foul edge`,
        value: `${penalized.foulDiff >= 0 ? "+" : ""}${penalized.foulDiff.toFixed(1)}`,
        detail: `${penalized.games} games · ${formatPct(penalized.winRate)} wins`,
      },
      {
        label: "Whistle swing",
        value: bestSpread.toFixed(1),
        detail: "Fouls per game differential gap",
      },
    ],
    sampleNote: `${favored.games + penalized.games} games across two teams · min ${MIN_TEAM_GAMES} per team`,
    links: [
      { label: ref.name, href: `/refs/${ref.slug}` },
      { label: favoredName, href: `/teams/${favored.team}` },
      { label: penalizedName, href: `/teams/${penalized.team}` },
    ],
    score: rankScoreLocal(bestSpread / 5, favored.games + penalized.games, MIN_TEAM_GAMES * 2),
    sampleGames: favored.games + penalized.games,
  };
}

function whistleParadoxFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const ref = [...stats.refs]
    .filter((r) => r.games >= MIN_WHISTLE_GAMES)
    .sort((a, b) => b.foulsDelta - a.foulsDelta)[0];
  if (!ref) return null;

  return {
    id: "whistle-paradox",
    category: "whistle-extreme",
    headline: `${ref.name} whistles heavy, scores stay low`,
    summary: `${ref.name} averages ${ref.avgFouls} fouls (${formatSigned(ref.foulsDelta)} vs league) yet only ${formatPct(ref.overRate)} of games beat ${stats.meta.leagueOverBaseline} points.`,
    stats: [
      {
        label: "Fouls per game",
        value: String(ref.avgFouls),
        detail: `${formatSigned(ref.foulsDelta)} vs league avg`,
      },
      {
        label: "Over benchmark",
        value: formatPct(ref.overRate),
        detail: `${ref.games} games`,
      },
      {
        label: "Avg combined score",
        value: String(ref.avgTotalPoints),
        detail: `${formatSigned(ref.totalPointsDelta)} vs ${stats.meta.leagueAvgTotal}`,
      },
    ],
    sampleNote: `${ref.games} games · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: `${ref.name} profile`, href: `/refs/${ref.slug}` }],
    score: rankScoreLocal(ref.foulsDelta / 5 + (0.5 - ref.overRate), ref.games, MIN_WHISTLE_GAMES),
    sampleGames: ref.games,
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

  const direction = best.coverRate >= 0.5 ? "covers" : "fails to cover";
  const record = best.ref.bettingStats!.homeTeamAts;

  return {
    id: "ats-outlier",
    category: "ats-edge",
    headline: `${best.ref.name}: home teams ${direction} ${formatPctFromWlp(record.wins, record.losses, record.pushes)} ATS`,
    summary: `Among ${best.games} lined games, home teams are ${formatWlpShort(record)} against the spread when ${best.ref.name} officiates, ${(best.edge * 100).toFixed(1)} pts from a neutral 50% split.`,
    explainer: `ATS splits require closing-line data. Where sportsbook lines are unavailable, estimated lines are used; treat as exploratory historical context only.`,
    stats: [
      {
        label: "Home ATS",
        value: formatWlpShort(record),
        detail: formatPctFromWlp(record.wins, record.losses, record.pushes),
      },
      {
        label: "Sample",
        value: String(best.games),
        detail: `Min ${MIN_ATS_GAMES} decisive games`,
      },
      {
        label: "Deviation vs 50%",
        value: `${(best.edge * 100).toFixed(1)} pts`,
        detail: "Absolute deviation",
      },
    ],
    sampleNote: `${best.games} ATS decisions · estimated closing lines where needed · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: best.ref.name, href: `/refs/${best.ref.slug}` }],
    score: rankScoreLocal(best.edge, best.games, MIN_ATS_GAMES),
    sampleGames: best.games,
  };
}

function ouAtsEdgeFinding(stats: RefStatsFile): ScoredFindingBase | null {
  if (!stats.meta.atsAvailable) return null;

  let best:
    | { ref: RefProfile; overRate: number; games: number; edge: number }
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
      best = { ref, overRate: rate, games, edge };
    }
  }

  if (!best) return null;

  const record = best.ref.bettingStats!.overUnder.overall;
  const lean = best.overRate >= 0.5 ? "overs" : "unders";

  return {
    id: "ou-ats-edge",
    category: "ou-edge",
    headline: `${best.ref.name}: highest historical ${lean} rate vs closing totals`,
    summary: `Totals finish ${lean} ${formatPctFromWlp(record.wins, record.losses, record.pushes)} (${formatWlpShort(record)}) across ${best.games} lined games, ${(best.edge * 100).toFixed(1)} pts from a neutral 50% baseline.`,
    explainer: `O/U ATS uses estimated closing totals where sportsbook data is unavailable. Minimum ${MIN_OU_ATS_GAMES}+ decisive games required before surfacing.`,
    stats: [
      {
        label: "O/U ATS",
        value: formatWlpShort(record),
        detail: formatPctFromWlp(record.wins, record.losses, record.pushes),
      },
      {
        label: "Sample",
        value: String(best.games),
        detail: `Min ${MIN_OU_ATS_GAMES} decisive games`,
      },
      {
        label: "Deviation vs 50%",
        value: `${(best.edge * 100).toFixed(1)} pts`,
        detail: `Historical ${lean} association`,
      },
    ],
    sampleNote: `${best.games} O/U decisions · estimated closing lines where needed · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: best.ref.name, href: `/refs/${best.ref.slug}` }],
    score: rankScoreLocal(best.edge, best.games, MIN_OU_ATS_GAMES),
    sampleGames: best.games,
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
    id: "team-crew-anomaly",
    category: "team-crew",
    headline: `${teamName} runs ${lean} ${(best.delta * 100).toFixed(0)} pts off neutral with this crew`,
    summary: `When ${crewLabel}${best.split.crewNames.length > 2 ? "…" : ""} work ${teamName} games, ${formatPct(best.split.overRate)} finish ${lean} ${baseline} combined points (${best.split.games} games).`,
    stats: [
      {
        label: "Over benchmark",
        value: formatPct(best.split.overRate),
        detail: `${best.split.games} games`,
      },
      {
        label: "Avg total",
        value: String(best.split.avgTotalPoints),
        detail: `vs ${stats.meta.leagueAvgTotal} league avg`,
      },
      {
        label: "Foul differential",
        value: `${best.split.foulDifferential >= 0 ? "+" : ""}${best.split.foulDifferential.toFixed(1)}`,
        detail: `${best.team} vs opponents`,
      },
    ],
    sampleNote: `Min ${MIN_TEAM_CREW_GAMES} games per crew · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: teamName, href: `/teams/${best.team}` }],
    score: rankScoreLocal(best.delta, best.split.games, MIN_TEAM_CREW_GAMES),
    sampleGames: best.split.games,
  };
}

function scoringOutlierFinding(stats: RefStatsFile): ScoredFindingBase | null {
  const qualified = stats.refs.filter((r) => r.games >= MIN_REF_GAMES);
  if (qualified.length === 0) return null;

  const ref = [...qualified].sort(
    (a, b) => Math.abs(b.totalPointsDelta) - Math.abs(a.totalPointsDelta),
  )[0];
  const effect = ref.totalPointsDelta / stats.meta.leagueAvgTotal;

  return {
    id: "scoring-outlier",
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
        label: "Avg fouls",
        value: String(ref.avgFouls),
        detail: `${formatSigned(ref.foulsDelta)} vs league`,
      },
    ],
    sampleNote: `${MIN_REF_GAMES}+ game sample · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: ref.name, href: `/refs/${ref.slug}` }],
    score: rankScoreLocal(effect, ref.games, MIN_REF_GAMES),
    sampleGames: ref.games,
  };
}

function formatWlpShort(record: WlpRecord): string {
  if (record.pushes > 0) {
    return `${record.wins}-${record.losses}-${record.pushes}`;
  }
  return `${record.wins}-${record.losses}`;
}

const NBA_FINDING_CTX: LeagueFindingContext = {
  league: "NBA",
  paths: {
    idPrefix: "",
    refsBrowsePath: "/refs",
    refPath: (slug) => `/refs/${slug}`,
    teamPath: (abbr) => `/teams/${abbr}`,
    matrixPath: "/matrix",
    crewsPath: "/crews",
    trendsPath: "/trends",
  },
  labels: {
    scoreUnit: "pts",
    whistleUnit: "fouls",
    teamName: (abbr) => {
      const team = getTeam(abbr);
      return team ? teamFullName(team) : abbr;
    },
  },
  getTeamSplits,
  teams: NBA_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: teamFullName(team),
    name: team.name,
    nbaId: team.nbaId,
  })),
};

function collectCandidates(stats: RefStatsFile): ScoredFindingBase[] {
  const refTeams = aggregateRefTeams(stats);
  const candidates: (ScoredFindingBase | null)[] = [
    leagueUnderFinding(stats),
    rareOverRefsFinding(stats),
    overRateTeamSplitFinding(stats),
    foulEdgeLosingFinding(stats),
    scoringExtremesFinding(stats),
    crossTeamWhistleFinding(stats, refTeams),
    whistleParadoxFinding(stats),
    atsOutlierFinding(stats),
    ouAtsEdgeFinding(stats),
    teamCrewAnomalyFinding(stats),
    scoringOutlierFinding(stats),
    buildMatrixExtremeFinding(stats, NBA_FINDING_CTX, "high"),
    buildMatrixExtremeFinding(stats, NBA_FINDING_CTX, "low"),
    buildCrewDominanceFinding(stats, NBA_FINDING_CTX),
    buildYoYTrendFinding(stats, NBA_FINDING_CTX),
    buildTeamHomeRoadFinding(stats, NBA_FINDING_CTX),
    buildCloseGameLeagueFinding(stats, NBA_FINDING_CTX),
    buildWhistleOutlierFinding(stats, NBA_FINDING_CTX),
    buildOverRateOutlierFinding(stats, NBA_FINDING_CTX, "low"),
  ];
  return candidates.filter((c): c is ScoredFindingBase => c !== null);
}

function resolveStats(scopedSeasons?: string[]) {
  const full = getRefStats();
  if (!scopedSeasons?.length) return full;
  return buildScopedRefStats("nba", full, scopedSeasons);
}

export function computeFindings(
  limit = 6,
  scopedSeasons?: string[],
): Finding[] {
  const stats = resolveStats(scopedSeasons);
  if (stats.refs.length === 0) return [];

  const ranked = rankScoredFindings(collectCandidates(stats));
  return pickFeaturedFindings(ranked, limit);
}

export function computeAllFindings(scopedSeasons?: string[]): Finding[] {
  const stats = resolveStats(scopedSeasons);
  if (stats.refs.length === 0) return [];

  return rankScoredFindings(collectCandidates(stats))
    .map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip scoring fields
      const { score, sampleGames, ...finding } = item;
      return finding;
    });
}
