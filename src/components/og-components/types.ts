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
  /** Emphasize this card when generating a league-specific OG image. */
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
  leagueCards: OgLeagueHubCardData[];
  slateGame: OgUpcomingSlateCardData | null;
  focusLeagueId?: LeagueId | null;
  subtitle?: string;
};
