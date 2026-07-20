import type {
  HeroViewProps,
  OgUpcomingSlateCardData,
} from "@/components/og-components/types";
import { formatOgHighlight } from "@/lib/og-brand";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import type { LeagueId } from "@/lib/leagues";
import { LEAGUES } from "@/lib/leagues";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";

export type DashboardOgContent = HeroViewProps;

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

function pickPulseInsights(
  cards: LeagueInsightCard[],
  focusLeagueId?: LeagueId | null,
  limit = 3,
) {
  const prioritized = focusLeagueId
    ? [
        ...cards.filter((card) => card.leagueId === focusLeagueId),
        ...cards.filter((card) => card.leagueId !== focusLeagueId),
      ]
    : cards;

  return prioritized.slice(0, limit).map(formatOgHighlight);
}

export function dashboardOgContent(focusLeagueId?: LeagueId | null): DashboardOgContent {
  const snapshot = loadOverviewSnapshot();
  const pulseInsights = pickPulseInsights(
    snapshot.standoutSplitCards.length > 0
      ? snapshot.standoutSplitCards
      : snapshot.insightCards,
    focusLeagueId,
  );

  const slateGame = pickSlateGame(snapshot.upcomingSlate?.games ?? [], focusLeagueId);

  const subtitle = focusLeagueId
    ? `${LEAGUES[focusLeagueId]?.label ?? focusLeagueId.toUpperCase()} referee analytics`
    : "Verified officiating analytics";

  return {
    pulseInsights,
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
