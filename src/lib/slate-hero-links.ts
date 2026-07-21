import type { HubHeroLeagueId } from "@/components/LeagueHubHero";
import { insightsViewHref } from "@/lib/insights-routes";
import { leagueHref, type LeagueId } from "@/lib/leagues";

export type SlateHeroStatKey = "officials" | "games" | "seasons";

export type SlateHeroAction = {
  href: string;
  label: string;
};

type SlateHeroLeagueId = Extract<
  LeagueId,
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba"
>;

/** Map visible season counts to the closest scope toggle value. */
export function scopeParamForSeasonCount(seasonCount: number): string | null {
  if (seasonCount <= 0) return null;
  if (seasonCount === 1) return "current";
  if (seasonCount <= 5) return "last5";
  if (seasonCount <= 10) return "last10";
  return null;
}

export function slateHeroStatHref(
  leagueId: SlateHeroLeagueId,
  key: SlateHeroStatKey,
  seasonCount = 0,
): string {
  switch (key) {
    case "officials":
      return leagueHref(leagueId, "/refs");
    case "games":
      return leagueHref(leagueId, "/matrix");
    case "seasons": {
      const base = insightsViewHref(leagueId as HubHeroLeagueId, "trends");
      const scope = scopeParamForSeasonCount(seasonCount);
      return scope ? `${base}?scope=${scope}` : base;
    }
  }
}

export function slateHeroActions(leagueId: SlateHeroLeagueId): SlateHeroAction[] {
  const matrixLabel = "Ref matrix";

  return [
    {
      href: insightsViewHref(leagueId as HubHeroLeagueId, "tendencies"),
      label: "Tendency index",
    },
    {
      href: leagueHref(leagueId, "/matrix"),
      label: matrixLabel,
    },
    {
      href: leagueHref(leagueId, "/teams"),
      label: leagueId === "epl" || leagueId === "laliga" ? "Club histories" : "Team histories",
    },
    {
      href: "#dataset-findings",
      label: "Season highlights",
    },
  ];
}
