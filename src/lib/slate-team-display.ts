import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import { getTeam as getCfbTeam } from "@/lib/cfb/teams";
import { getTeam as getEplTeam } from "@/lib/epl/teams";
import { getTeam as getLaligaTeam } from "@/lib/laliga/teams";
import type { LeagueId } from "@/lib/leagues";
import { getTeam as getNflTeam } from "@/lib/nfl/teams";
import { getTeam as getNhlTeam } from "@/lib/nhl/teams";
import { getTeam as getNbaTeam } from "@/lib/teams";
import {
  getTeam as getWnbaTeam,
  resolveWnbaTeamAbbr,
  teamLogoUrl as wnbaTeamLogoUrl,
} from "@/lib/wnba/teams";

export type SlateTeamLike = {
  abbr: string;
  name: string;
  displayName: string;
  nbaId?: number;
  logoUrl?: string;
};

function slateTeamDisplayName(
  team: { abbr: string; name: string; city?: string },
  leagueId: LeagueId,
): string {
  if (leagueId === "epl" || leagueId === "laliga") {
    return team.name;
  }
  if (team.city) {
    return team.city;
  }
  return team.name || team.abbr;
}

function withDisplayName<T extends { abbr: string; name: string; city?: string }>(
  team: T,
  leagueId: LeagueId,
): T & { displayName: string } {
  return {
    ...team,
    displayName: slateTeamDisplayName(team, leagueId),
  };
}

export type SlateTeamLogoSport =
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb"
  | "wnba";

export function slateTeamLogoSport(leagueId: LeagueId): SlateTeamLogoSport {
  if (leagueId === "wnba") return "wnba";
  if (leagueId === "mlb") return "nba";
  return leagueId;
}

export function resolveSlateTeam(leagueId: LeagueId, abbr: string): SlateTeamLike {
  const key = abbr.toUpperCase();
  if (leagueId === "wnba") {
    const canonical = resolveWnbaTeamAbbr(abbr);
    const team = getWnbaTeam(canonical);
    if (team) {
      return withDisplayName(
        { ...team, logoUrl: wnbaTeamLogoUrl(canonical) },
        leagueId,
      );
    }
    return {
      abbr: canonical,
      name: canonical,
      displayName: canonical,
      logoUrl: wnbaTeamLogoUrl(canonical),
    };
  }

  const team =
    leagueId === "nba"
      ? getNbaTeam(key)
      : leagueId === "nhl"
        ? getNhlTeam(key)
        : leagueId === "nfl"
          ? getNflTeam(key)
          : leagueId === "epl"
            ? getEplTeam(key)
            : leagueId === "laliga"
              ? getLaligaTeam(key)
              : leagueId === "cbb"
                ? getCbbTeam(key)
                : getCfbTeam(key);

  return team
    ? withDisplayName(team, leagueId)
    : { abbr: key, name: key, displayName: key };
}

export function formatSlateDateLabel(slateDate: string | undefined): string | null {
  if (!slateDate) return null;
  return new Date(`${slateDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
