import { teamLogoUrl as cbbTeamLogoUrl } from "@/lib/cbb/teams";
import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import { teamLogoUrl as cfbTeamLogoUrl } from "@/lib/cfb/teams";
import { getTeam as getCfbTeam } from "@/lib/cfb/teams";
import { teamLogoUrl as eplTeamLogoUrl } from "@/lib/epl/teams";
import { getTeam as getEplTeam } from "@/lib/epl/teams";
import { teamLogoUrl as laligaTeamLogoUrl } from "@/lib/laliga/teams";
import { getTeam as getLaligaTeam } from "@/lib/laliga/teams";
import type { LeagueId } from "@/lib/leagues";
import { teamLogoUrl as nflTeamLogoUrl } from "@/lib/nfl/teams";
import { getTeam as getNflTeam } from "@/lib/nfl/teams";
import { teamLogoUrl as nhlTeamLogoUrl } from "@/lib/nhl/teams";
import { getTeam as getNhlTeam } from "@/lib/nhl/teams";
import { getTeam as getNbaTeam, teamLogoUrl as nbaTeamLogoUrl } from "@/lib/teams";
import {
  getTeam as getWnbaTeam,
  resolveWnbaTeamAbbr,
  teamLogoUrl as wnbaTeamLogoUrl,
} from "@/lib/wnba/teams";

export type SlateTeamLike = {
  abbr: string;
  name: string;
  nbaId?: number;
  logoUrl?: string;
};

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

function slateTeamLogoUrl(
  leagueId: LeagueId,
  abbr: string,
  team?: { nbaId?: number },
): string | undefined {
  const key = abbr.toUpperCase();
  switch (leagueId) {
    case "wnba": {
      const canonical = resolveWnbaTeamAbbr(key);
      return wnbaTeamLogoUrl(canonical) || undefined;
    }
    case "nfl":
      return nflTeamLogoUrl(key) || undefined;
    case "epl":
      return eplTeamLogoUrl(key) || undefined;
    case "laliga":
      return laligaTeamLogoUrl(key) || undefined;
    case "nhl":
      return nhlTeamLogoUrl(key) || undefined;
    case "cbb":
      return cbbTeamLogoUrl(key) || undefined;
    case "cfb":
      return cfbTeamLogoUrl(key) || undefined;
    case "nba": {
      const nbaTeam = team?.nbaId ? { nbaId: team.nbaId } : getNbaTeam(key);
      return nbaTeam ? nbaTeamLogoUrl(nbaTeam.nbaId) : undefined;
    }
    default:
      return undefined;
  }
}

function finalizeSlateTeam<T extends { abbr: string; name: string; nbaId?: number }>(
  leagueId: LeagueId,
  team: T,
): SlateTeamLike {
  return {
    ...team,
    logoUrl: slateTeamLogoUrl(leagueId, team.abbr, team),
  };
}

export function resolveSlateTeam(leagueId: LeagueId, abbr: string): SlateTeamLike {
  const key = abbr.toUpperCase();
  if (leagueId === "wnba") {
    const canonical = resolveWnbaTeamAbbr(abbr);
    const team = getWnbaTeam(canonical);
    if (team) {
      return finalizeSlateTeam(leagueId, { ...team, abbr: canonical });
    }
    return {
      abbr: canonical,
      name: canonical,
      logoUrl: slateTeamLogoUrl(leagueId, canonical),
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
    ? finalizeSlateTeam(leagueId, team)
    : {
        abbr: key,
        name: key,
        logoUrl: slateTeamLogoUrl(leagueId, key),
      };
}

export function formatSlateDateLabel(slateDate: string | undefined): string | null {
  if (!slateDate) return null;
  return new Date(`${slateDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
