import { loadLeagueStats } from "@/lib/load-league-stats";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";

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

export type SpotlightRef = {
  leagueId: LeagueId;
  leagueLabel: string;
  slug: string;
  name: string;
  games: number;
  whistlePerGame: number;
  whistleLabel: string;
  whistleDelta: number;
  href: string;
  recentWhistle: number[];
};

export type CrossLeagueOverview = {
  totalRefs: number;
  totalGames: number;
  liveLeagueCount: number;
  catalogCompetitionCount: number;
  whistleEventsLogged: number;
  whistleLabel: string;
  leagueCards: LeagueOverviewCard[];
  spotlight: SpotlightRef | null;
  allRefs: { slug: string; name: string; games: number; leagueId: LeagueId; href: string }[];
};

const MIN_SPOTLIGHT_GAMES = 25;

function gameCountForLeague(leagueId: LeagueId, stats: ReturnType<typeof loadLeagueStats>["stats"]): number {
  const metaCount = stats.meta.totalGamesProcessed;
  if (typeof metaCount === "number" && metaCount > 0) return metaCount;
  return stats.refs.reduce((sum, ref) => sum + ref.games, 0);
}

function whistlePerGameForRef(ref: RefProfile, leagueId: LeagueId): number {
  if (leagueId === "nhl") return ref.nhlAnalytics?.avgMinorsPerGame ?? ref.avgFouls;
  if (leagueId === "nfl") return ref.nflAnalytics?.avgFlagsPerGame ?? ref.avgFouls;
  if (leagueId === "epl") {
    const y = ref.eplAnalytics?.avgYellowCardsPerGame ?? 0;
    const r = ref.eplAnalytics?.avgRedCardsPerGame ?? 0;
    return y + r;
  }
  return ref.avgFouls;
}

function whistleDeltaForRef(ref: RefProfile, leagueId: LeagueId): number {
  if (leagueId === "nhl") return ref.nhlAnalytics?.minorsDelta ?? ref.foulsDelta;
  if (leagueId === "nfl") return ref.nflAnalytics?.flagsDelta ?? ref.foulsDelta;
  if (leagueId === "epl") return ref.eplAnalytics?.yellowCardsDelta ?? ref.foulsDelta;
  return ref.foulsDelta;
}

function whistleLabelForLeague(leagueId: LeagueId): string {
  if (leagueId === "nhl") return "Minors per game";
  if (leagueId === "nfl") return "Flags per game";
  if (leagueId === "epl") return "Cards per game";
  return "Fouls per game";
}

function scorePerGameForLeague(leagueId: LeagueId, stats: ReturnType<typeof loadLeagueStats>["stats"]): number {
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

function recentWhistleSeries(ref: RefProfile, leagueId: LeagueId, limit = 12): number[] {
  const games = ref.recentGames.slice(0, limit);
  if (leagueId === "nhl") {
    return games.map((g) => (g.homeMinors ?? 0) + (g.awayMinors ?? 0));
  }
  if (leagueId === "nfl") {
    return games.map((g) => (g.homeFlags ?? 0) + (g.awayFlags ?? 0));
  }
  return games.map((g) => g.totalFouls);
}

export function buildCrossLeagueOverview(catalogCompetitionCount: number): CrossLeagueOverview {
  const leagueCards: LeagueOverviewCard[] = [];
  let totalRefs = 0;
  let totalGames = 0;
  let whistleEventsLogged = 0;
  const allRefs: CrossLeagueOverview["allRefs"] = [];

  let bestSpotlight: SpotlightRef | null = null;
  let bestDelta = -Infinity;

  for (const leagueId of VERIFIED_LIVE_LEAGUE_IDS) {
    const { stats } = loadLeagueStats(leagueId);
    const config = LEAGUES[leagueId];
    const refCount = stats.refs.length;
    const gameCount = gameCountForLeague(leagueId, stats);
    const whistlePerGame =
      leagueId === "nhl"
        ? stats.meta.leagueAvgMinors ?? stats.meta.leagueAvgFouls
        : leagueId === "epl"
          ? (stats.meta.leagueAvgYellowCards ?? 0) + (stats.meta.leagueAvgRedCards ?? 0)
          : leagueId === "nfl"
            ? stats.meta.leagueAvgFouls
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
        href: refHref(leagueId, ref.slug),
      });

      if (ref.games < MIN_SPOTLIGHT_GAMES) continue;
      const delta = whistleDeltaForRef(ref, leagueId);
      if (delta > bestDelta) {
        bestDelta = delta;
        bestSpotlight = {
          leagueId,
          leagueLabel: config.label,
          slug: ref.slug,
          name: ref.name,
          games: ref.games,
          whistlePerGame: whistlePerGameForRef(ref, leagueId),
          whistleLabel: whistleLabelForLeague(leagueId),
          whistleDelta: delta,
          href: refHref(leagueId, ref.slug),
          recentWhistle: recentWhistleSeries(ref, leagueId),
        };
      }
    }

    leagueCards.push({
      leagueId,
      label: config.label,
      shortLabel: config.shortLabel,
      href: config.pathPrefix || "/",
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
    spotlight: bestSpotlight,
    allRefs: allRefs.sort((a, b) => b.games - a.games),
  };
}
