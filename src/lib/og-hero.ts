import type {
  HeroViewProps,
  OgLeagueHubCardData,
  OgUpcomingSlateCardData,
} from "@/components/og-components/types";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";
import { LEAGUES } from "@/lib/leagues";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { OVERVIEW_HUB_LEAGUE_IDS } from "@/lib/verified-live-leagues";

export type DashboardOgContent = HeroViewProps;

function toOgLeagueCard(
  card: LeagueOverviewCard,
  focusLeagueId?: LeagueId | null,
): OgLeagueHubCardData {
  return {
    leagueId: card.leagueId,
    label: card.label,
    shortLabel: card.shortLabel,
    refCount: card.refCount,
    gameCount: card.gameCount,
    whistleLabel: card.whistleLabel,
    whistlePerGame: card.whistlePerGame,
    scoreLabel: card.scoreLabel,
    scorePerGame: card.scorePerGame,
    highlighted: focusLeagueId ? card.leagueId === focusLeagueId : undefined,
  };
}

function toOgSlateGame(entry: OverviewSlateEntry): OgUpcomingSlateCardData {
  return {
    leagueId: entry.leagueId,
    slateDate: entry.slateDate,
    awayTeam: entry.awayTeam,
    homeTeam: entry.homeTeam,
    gameContextLine: entry.gameContextLine,
  };
}

function pickSlateGame(
  games: OverviewSlateEntry[],
  focusLeagueId?: LeagueId | null,
): OgUpcomingSlateCardData | null {
  if (games.length === 0) return null;

  if (focusLeagueId) {
    const leagueMatch = games.find((game) => game.leagueId === focusLeagueId);
    if (leagueMatch) return toOgSlateGame(leagueMatch);
  }

  return toOgSlateGame(games[0]!);
}

function hubOrderIndex(leagueId: LeagueId): number {
  const index = OVERVIEW_HUB_LEAGUE_IDS.indexOf(
    leagueId as (typeof OVERVIEW_HUB_LEAGUE_IDS)[number],
  );
  return index === -1 ? 99 : index;
}

export function dashboardOgContent(focusLeagueId?: LeagueId | null): DashboardOgContent {
  const snapshot = loadOverviewSnapshot();
  const leagueCards = snapshot.leagueCards
    .filter((card) => isDashboardLeagueExposed(card.leagueId))
    .sort((a, b) => hubOrderIndex(a.leagueId) - hubOrderIndex(b.leagueId))
    .slice(0, 6)
    .map((card) => toOgLeagueCard(card, focusLeagueId));

  const slateGame = pickSlateGame(snapshot.upcomingSlate?.games ?? [], focusLeagueId);

  const subtitle = focusLeagueId
    ? `${LEAGUES[focusLeagueId]?.label ?? focusLeagueId.toUpperCase()} referee analytics`
    : "Verified officiating analytics";

  return {
    leagueCards,
    slateGame,
    focusLeagueId: focusLeagueId ?? null,
    subtitle,
  };
}

export function parseOgLeagueId(value: string | undefined | null): LeagueId | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized in LEAGUES) {
    return normalized as LeagueId;
  }
  return null;
}
