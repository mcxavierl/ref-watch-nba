import { leagueCardsPerGame } from "@/lib/soccer-card-metrics";
import { loadLeagueStats } from "@/lib/load-league-stats";
import {
  isNcaaConferenceGatedLeague,
  NCAA_KEY_CONFERENCES_LABEL,
} from "@/lib/ncaa-conference-gate";
import {
  DASHBOARD_GRID_LEAGUE_IDS,
  isDashboardLeagueExposed,
  isLeagueAnalyticsUnlocked,
} from "@/config/leagues";
import { LEAGUES, leagueHubHref, type LeagueId } from "@/lib/leagues";
import { loadOverviewInsightCards } from "@/lib/overview-insights-data";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import {
  paceBarWidthPercent,
  sortLeaguePaceCards,
} from "@/lib/league-pace-bars";
import {
  buildOverviewUpcomingSlate,
  type OverviewUpcomingSlate,
} from "@/lib/overview-upcoming-slate";

export type LeagueOverviewCard = {
  leagueId: LeagueId;
  label: string;
  shortLabel: string;
  href: string;
  refCount: number;
  gameCount: number;
  seasonCount: number;
  whistlePerGame: number;
  whistleLabel: string;
  scorePerGame: number;
  scoreLabel: string;
  whistleBar: number;
  scoreBar: number;
};

export type CrossLeagueOverview = {
  totalRefs: number;
  totalGames: number;
  liveLeagueCount: number;
  catalogCompetitionCount: number;
  whistleEventsLogged: number;
  whistleLabel: string;
  leagueCards: LeagueOverviewCard[];
  insightCards: LeagueInsightCard[];
  upcomingSlate: OverviewUpcomingSlate;
  allRefs: {
    slug: string;
    name: string;
    games: number;
    leagueId: LeagueId;
    leagueLabel: string;
    href: string;
  }[];
};

function gameCountForLeague(
  leagueId: LeagueId,
  stats: ReturnType<typeof loadLeagueStats>["stats"],
): number {
  const metaCount = stats.meta.totalGamesProcessed;
  if (typeof metaCount === "number" && metaCount > 0) return metaCount;
  return stats.refs.reduce((sum, ref) => sum + ref.games, 0);
}

function whistleLabelForLeague(leagueId: LeagueId): string {
  if (leagueId === "nhl") return "Minors per game";
  if (leagueId === "nfl" || leagueId === "cfb") return "Flags per game";
  if (leagueId === "epl" || leagueId === "laliga") return "Cards per game";
  return "Fouls per game";
}

function scorePerGameForLeague(
  leagueId: LeagueId,
  stats: ReturnType<typeof loadLeagueStats>["stats"],
): number {
  if (leagueId === "nhl") return stats.meta.leagueAvgTotal;
  if (leagueId === "epl") return stats.meta.leagueAvgTotal;
  return stats.meta.leagueAvgTotal;
}

function scoreLabelForLeague(leagueId: LeagueId): string {
  const unit = LEAGUES[leagueId].metrics.scoreUnitPlural;
  return `${unit} per game`;
}

function refHref(leagueId: LeagueId, slug: string): string {
  const prefix = LEAGUES[leagueId].pathPrefix;
  return `${prefix}/refs/${slug}`;
}

export function buildCrossLeagueOverview(catalogCompetitionCount: number): CrossLeagueOverview {
  const leagueCards: LeagueOverviewCard[] = [];
  let totalRefs = 0;
  let totalGames = 0;
  let whistleEventsLogged = 0;
  const allRefs: CrossLeagueOverview["allRefs"] = [];

  for (const leagueId of DASHBOARD_GRID_LEAGUE_IDS) {
    if (!isDashboardLeagueExposed(leagueId)) continue;
    const { stats } = loadLeagueStats(leagueId);
    const config = LEAGUES[leagueId];
    const analyticsUnlocked = isLeagueAnalyticsUnlocked(leagueId, stats);
    const refCount = stats.refs.length;
    const gameCount = gameCountForLeague(leagueId, stats);
    const whistlePerGame =
      leagueId === "nhl"
        ? stats.meta.leagueAvgMinors ?? stats.meta.leagueAvgFouls
        : leagueId === "epl" || leagueId === "laliga"
          ? leagueCardsPerGame(stats)
          : stats.meta.leagueAvgFouls;

    if (analyticsUnlocked) {
      totalRefs += refCount;
      totalGames += gameCount;
      whistleEventsLogged += Math.round(whistlePerGame * gameCount);

      for (const ref of stats.refs) {
        allRefs.push({
          slug: ref.slug,
          name: ref.name,
          games: ref.games,
          leagueId,
          leagueLabel: config.shortLabel,
          href: refHref(leagueId, ref.slug),
        });
      }
    }

    const ncaaSuffix = isNcaaConferenceGatedLeague(leagueId)
      ? ` ${NCAA_KEY_CONFERENCES_LABEL}`
      : "";

    leagueCards.push({
      leagueId,
      label: `${config.label}${ncaaSuffix}`,
      shortLabel: `${config.shortLabel}${ncaaSuffix}`,
      href: leagueHubHref(leagueId),
      refCount,
      gameCount,
      seasonCount: stats.meta.seasons.length,
      whistlePerGame,
      whistleLabel: whistleLabelForLeague(leagueId),
      scorePerGame: scorePerGameForLeague(leagueId, stats),
      scoreLabel: scoreLabelForLeague(leagueId),
      whistleBar: 0,
      scoreBar: 0,
    });
  }

  for (const card of leagueCards) {
    card.whistleBar =
      paceBarWidthPercent(card.leagueId, "whistle", card.whistlePerGame) / 100;
    card.scoreBar =
      paceBarWidthPercent(card.leagueId, "score", card.scorePerGame) / 100;
  }

  const orderedLeagueCards = sortLeaguePaceCards(leagueCards);

  return {
    totalRefs,
    totalGames,
    liveLeagueCount: leagueCards.filter((card) => isDashboardLeagueExposed(card.leagueId))
      .length,
    catalogCompetitionCount,
    whistleEventsLogged,
    whistleLabel: "Whistle events logged",
    leagueCards: orderedLeagueCards,
    insightCards: loadOverviewInsightCards(),
    upcomingSlate: buildOverviewUpcomingSlate(),
    allRefs: allRefs.sort((a, b) => b.games - a.games),
  };
}
