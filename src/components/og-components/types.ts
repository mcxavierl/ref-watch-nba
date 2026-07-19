import type { BrandOgHighlight } from "@/lib/og-brand";
import type { LeagueId } from "@/lib/leagues";

export type OgLeagueHubCardData = {
  leagueId: LeagueId;
  label: string;
  shortLabel: string;
  refCount: number;
  gameCount: number;
  whistleLabel: string;
  whistlePerGame: number;
  scoreLabel: string;
  scorePerGame: number;
  highlighted?: boolean;
};

export type OgUpcomingSlateCardData = {
  leagueId: LeagueId;
  slateDate?: string;
  awayTeam: string;
  homeTeam: string;
  gameContextLine?: string;
};

export type HeroViewProps = {
  pulseInsights: BrandOgHighlight[];
  slateGame: OgUpcomingSlateCardData | null;
  focusLeagueId?: LeagueId | null;
  subtitle?: string;
};
