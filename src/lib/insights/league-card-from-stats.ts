import {
  computeMatrixExtremes,
  formatMatrixHighlightBaseline,
  type MatrixExtremeHighlight,
} from "@/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { insightDrilldownId } from "@/lib/insight-drilldown-types";
import { formatBaselinePct, formatPct } from "@/lib/stats-utils";
import { insightsViewHref } from "@/lib/insights-routes";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { OVERVIEW_INSIGHT_LEAGUE_IDS } from "@/lib/league-verification";
import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";
import type { LeagueInsightCard, LeagueInsightTone } from "@/lib/league-overview-insights";
import { heroToneFromWinRateDelta } from "@/lib/metric-significance";

type OverviewInsightLeagueId = (typeof OVERVIEW_INSIGHT_LEAGUE_IDS)[number];

export type LeagueCardBuildSetup = {
  teams: { abbr: string; label: string; name: string; nbaId?: number }[];
  getTeamSplits: (abbr: string) => TeamCrewSplit[];
  matrixLeague: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
};

function leaguePrefix(leagueId: LeagueId): string {
  return LEAGUES[leagueId].pathPrefix;
}

function refHref(leagueId: LeagueId, slug: string): string {
  return `${leaguePrefix(leagueId)}/refs/${slug}`;
}

function matrixHref(leagueId: LeagueId): string {
  return `${leaguePrefix(leagueId)}/matrix`;
}

function trendsHref(leagueId: OverviewInsightLeagueId): string {
  return insightsViewHref(leagueId, "trends");
}

function formatDeltaPts(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}pp`;
}

function heroToneFromDelta(delta: number): LeagueInsightTone {
  return heroToneFromWinRateDelta(delta);
}

function cardFromMatrix(
  leagueId: OverviewInsightLeagueId,
  highlight: MatrixExtremeHighlight,
): LeagueInsightCard {
  const config = LEAGUES[leagueId];
  const splitPct = formatPct(highlight.winRate);
  const baselinePct = formatBaselinePct(
    highlight.baselineGames,
    highlight.baselineWinRate,
  );
  const deltaLabel = formatDeltaPts(highlight.deltaPts);
  const direction =
    highlight.deltaPts > 0 ? "beats" : highlight.deltaPts < 0 ? "trails" : "matches";

  return {
    leagueId,
    label: config.label,
    shortLabel: config.shortLabel,
    kind: "matrix-edge",
    kicker: "Standout ref×team split",
    headline: `${highlight.refName} ${direction} ${highlight.teamLabel} baseline`,
    story: `${highlight.wins}-${highlight.losses} (${splitPct}) across ${highlight.games} games. Team sample without this ref: ${baselinePct} (${formatMatrixHighlightBaseline(highlight)}).`,
    heroValue: deltaLabel,
    heroLabel: "Win rate vs team baseline",
    heroTone: heroToneFromDelta(highlight.deltaPts),
    stats: [
      { label: "Ref×team record", value: `${highlight.wins}-${highlight.losses}` },
      { label: "Games", value: String(highlight.games) },
      { label: "Team baseline", value: baselinePct },
    ],
    links: [
      { label: "Open matrix", href: matrixHref(leagueId) },
      { label: "Ref profile", href: refHref(leagueId, highlight.refSlug) },
      { label: "League trends", href: trendsHref(leagueId) },
    ],
    entityName: highlight.refName,
    entityHref: refHref(leagueId, highlight.refSlug),
    teamLabel: highlight.teamLabel,
    refSlug: highlight.refSlug,
    teamAbbr: highlight.teamAbbr,
    drilldownId: insightDrilldownId(
      leagueId,
      highlight.refSlug,
      highlight.teamAbbr,
    ),
    significance: {
      refWins: highlight.wins,
      refGames: highlight.games,
      baselineWins: highlight.baselineWins,
      baselineGames: highlight.baselineGames,
    },
  };
}

/** Matrix-only league cards for memory-efficient build pipelines. */
const MULTI_STANDOUT_LEAGUE_IDS = new Set<OverviewInsightLeagueId>(["nba", "nfl", "epl"]);
const MULTI_STANDOUT_MATRIX_LIMIT = 4;

function sortMatrixHighlightsBySample(
  highlights: MatrixExtremeHighlight[],
): MatrixExtremeHighlight[] {
  return [...highlights].sort((a, b) => {
    if (b.games !== a.games) return b.games - a.games;
    return Math.abs(b.deltaPts) - Math.abs(a.deltaPts);
  });
}

export function buildLeagueStandoutCardsForLeague(
  leagueId: OverviewInsightLeagueId,
  stats: RefStatsFile,
  setup: LeagueCardBuildSetup,
): LeagueInsightCard[] {
  if (stats.refs.length === 0) return [];

  const matrix = computeRefTeamMatrix(
    stats,
    setup.teams,
    setup.getTeamSplits,
    8,
    { league: setup.matrixLeague },
  );
  const limit = MULTI_STANDOUT_LEAGUE_IDS.has(leagueId) ? MULTI_STANDOUT_MATRIX_LIMIT : 1;
  const highlights = sortMatrixHighlightsBySample(
    computeMatrixExtremes(matrix, Math.max(limit * 4, 16)),
  );
  const cards: LeagueInsightCard[] = [];
  const seen = new Set<string>();

  for (const highlight of highlights) {
    const key = `${highlight.refSlug}|${highlight.teamAbbr.toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(cardFromMatrix(leagueId, highlight));
    if (cards.length >= limit) break;
  }

  return cards;
}

export function buildLeagueInsightCardForLeague(
  leagueId: OverviewInsightLeagueId,
  stats: RefStatsFile,
  setup: LeagueCardBuildSetup,
): LeagueInsightCard | null {
  return buildLeagueStandoutCardsForLeague(leagueId, stats, setup)[0] ?? null;
}
