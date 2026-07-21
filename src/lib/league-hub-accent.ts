import type { LeagueId } from "@/lib/leagues";

/** Tailwind ribbon classes for leagues without a `--chooser-rainbow` token. */
const LEAGUE_HUB_RIBBON_CLASS: Partial<Record<LeagueId, string>> = {
  wnba: "league-hub-card-ribbon--wnba",
};

export function leagueHubRibbonClass(leagueId: LeagueId): string {
  return LEAGUE_HUB_RIBBON_CLASS[leagueId] ?? "";
}
