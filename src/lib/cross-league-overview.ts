import { leagueCardsPerGame } from "@/lib/soccer-card-metrics";
import { loadLeagueStats } from "@/lib/load-league-stats";
import {
  DASHBOARD_GRID_LEAGUE_IDS,
  isDashboardLeagueExposed,
  isLeagueAnalyticsUnlocked,
} from "@/config/leagues";
import { LEAGUES, leagueHubHref, type LeagueId } from "@/lib/leagues";
import {
  loadInsightsBundle,
  loadOverviewInsightCards,
} from "@/lib/insights/insights-query";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import type { TopStoriesStatus } from "@/lib/insights/generator";
import {
  paceBarWidthPercent,
  sortLeaguePaceCards,
} from "@/lib/league-pace-bars";
import {
  buildOverviewUpcomingSlate,
  type OverviewUpcomingSlate,
} from "@/lib/overview-upcoming-slate";
import { computeLeagueHomeCoverDelta } from "@/lib/league-home-bias-index";
import {
  NCAA_INTEGRITY_AUDIT_HREF,
  resolveNcaaAuditStatus,
  type NcaaAuditPendingLabel,
} from "@/lib/ncaa-audit-status";
import { isNcaaConferenceGatedLeague } from "@/lib/ncaa-conference-gate";

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
  /** League scoring pace uses a proxy average when closing lines are unavailable. */
  scoreEstimated: boolean;
  whistleBar: number;
  scoreBar: number;
  /** False for NCAA hubs still awaiting ingest or conference coverage. */
  analyticsUnlocked: boolean;
  auditCoveragePct?: number;
  auditHref?: string;
  auditPendingLabel?: NcaaAuditPendingLabel;
  /** Home ATS cover rate delta vs a neutral 50% split (from lined game logs). */
  homeBiasCoverDelta: string | null;
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
  topStories: LeagueInsightCard[];
  topStoriesStatus: TopStoriesStatus;
  topStoriesGeneratedAt: string | null;
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
  const labelUnit = unit.charAt(0).toUpperCase() + unit.slice(1);
  return `${labelUnit} per game`;
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
    const isNcaa = isNcaaConferenceGatedLeague(leagueId);
    let href = leagueHubHref(leagueId);
    let auditCoveragePct: number | undefined;
    let auditHref: string | undefined;
    let auditPendingLabel: NcaaAuditPendingLabel | undefined;

    if (isNcaa && !analyticsUnlocked) {
      const audit = resolveNcaaAuditStatus(leagueId, stats);
      auditCoveragePct = audit.coveragePct;
      auditHref = NCAA_INTEGRITY_AUDIT_HREF;
      auditPendingLabel =
        refCount > 0 ? audit.pendingLabel : "Awaiting ingest";
      href = NCAA_INTEGRITY_AUDIT_HREF;
    }

    const whistlePerGame = analyticsUnlocked
      ? leagueId === "nhl"
        ? stats.meta.leagueAvgMinors ?? stats.meta.leagueAvgFouls
        : leagueId === "epl" || leagueId === "laliga"
          ? leagueCardsPerGame(stats)
          : stats.meta.leagueAvgFouls
      : 0;

    const scorePerGame = analyticsUnlocked ? scorePerGameForLeague(leagueId, stats) : 0;
    const scoreEstimated = analyticsUnlocked && stats.meta.atsAvailable !== true;

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

    leagueCards.push({
      leagueId,
      label: config.label,
      shortLabel: config.shortLabel,
      href,
      refCount,
      gameCount,
      seasonCount: stats.meta.seasons.length,
      whistlePerGame,
      whistleLabel: whistleLabelForLeague(leagueId),
      scorePerGame,
      scoreLabel: scoreLabelForLeague(leagueId),
      scoreEstimated,
      whistleBar: 0,
      scoreBar: 0,
      analyticsUnlocked,
      auditCoveragePct,
      auditHref,
      auditPendingLabel,
      homeBiasCoverDelta: analyticsUnlocked
        ? computeLeagueHomeCoverDelta(leagueId)?.value ?? null
        : null,
    });
  }

  for (const card of leagueCards) {
    card.whistleBar =
      paceBarWidthPercent(card.leagueId, "whistle", card.whistlePerGame) / 100;
    card.scoreBar =
      paceBarWidthPercent(card.leagueId, "score", card.scorePerGame) / 100;
  }

  const orderedLeagueCards = sortLeaguePaceCards(leagueCards);
  const topStoriesBundle = loadInsightsBundle();

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
    topStories: topStoriesBundle.insights,
    topStoriesStatus: topStoriesBundle.status,
    topStoriesGeneratedAt: topStoriesBundle.generatedAt,
    upcomingSlate: buildOverviewUpcomingSlate(),
    allRefs: allRefs.sort((a, b) => b.games - a.games),
  };
}
