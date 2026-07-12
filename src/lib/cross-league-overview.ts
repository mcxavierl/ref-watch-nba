import { loadLeagueStats } from "@/lib/load-league-stats";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { LEAGUES, leagueHubHref, type LeagueId } from "@/lib/leagues";
import { loadOverviewInsightCards } from "@/lib/overview-insights-data";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
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
  if (leagueId === "nfl") return "Flags per game";
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

  for (const leagueId of VERIFIED_LIVE_LEAGUE_IDS) {
    const { stats } = loadLeagueStats(leagueId);
    const config = LEAGUES[leagueId];
    const refCount = stats.refs.length;
    const gameCount = gameCountForLeague(leagueId, stats);
    const whistlePerGame =
      leagueId === "nhl"
        ? stats.meta.leagueAvgMinors ?? stats.meta.leagueAvgFouls
        : leagueId === "epl" || leagueId === "laliga"
          ? (stats.meta.leagueAvgYellowCards ?? 0) + (stats.meta.leagueAvgRedCards ?? 0)
          : stats.meta.leagueAvgFouls;

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

    leagueCards.push({
      leagueId,
      label: config.label,
      shortLabel: config.shortLabel,
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

  const maxWhistle = Math.max(...leagueCards.map((c) => c.whistlePerGame), 1);
  const maxScore = Math.max(...leagueCards.map((c) => c.scorePerGame), 1);
  for (const card of leagueCards) {
    card.whistleBar = card.whistlePerGame / maxWhistle;
    card.scoreBar = card.scorePerGame / maxScore;
  }

  leagueCards.sort((a, b) => b.whistlePerGame - a.whistlePerGame);

  return {
    totalRefs,
    totalGames,
    liveLeagueCount: VERIFIED_LIVE_LEAGUE_IDS.length,
    catalogCompetitionCount,
    whistleEventsLogged,
    whistleLabel: "Whistle events logged",
    leagueCards,
    insightCards: loadOverviewInsightCards(),
    upcomingSlate: buildOverviewUpcomingSlate(),
    allRefs: allRefs.sort((a, b) => b.games - a.games),
  };
}
