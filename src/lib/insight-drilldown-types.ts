import type { LeagueInsightTone } from "@/lib/league-overview-insights";
import type { LeagueId } from "@/lib/leagues";

export type InsightDrilldownGame = {
  gameId: string;
  date: string;
  season: string;
  isHome: boolean;
  opponentLabel: string;
  teamScore: number;
  opponentScore: number;
  scoreLine: string;
  whistleCount: number;
  whistleLabel: string;
  spreadCovered: boolean | null;
  teamWon: boolean;
};

export type InsightVenueSplit = {
  wins: number;
  losses: number;
  games: number;
  winRate: number | null;
};

export type InsightCrewPartner = {
  name: string;
  games: number;
};

export type InsightDrilldownPayload = {
  drilldownId: string;
  leagueId: LeagueId;
  refSlug: string;
  refName: string;
  teamAbbr: string;
  teamLabel: string;
  heroValue: string;
  heroLabel: string;
  heroTone: LeagueInsightTone;
  wins: number;
  losses: number;
  winRate: number;
  baselineWinRate: number;
  deltaPts: number;
  games: InsightDrilldownGame[];
  homeSplit: InsightVenueSplit;
  awaySplit: InsightVenueSplit;
  crewPartners: InsightCrewPartner[];
};

export function insightDrilldownId(
  leagueId: LeagueId,
  refSlug: string,
  teamAbbr: string,
): string {
  return `${leagueId}--${refSlug}--${teamAbbr}`;
}

export function insightDrilldownAssetPath(drilldownId: string): string {
  return `/data/overview/drilldown/${drilldownId}.json`;
}
