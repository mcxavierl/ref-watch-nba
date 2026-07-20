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

export function resolveSlateTeam(leagueId: LeagueId, abbr: string): SlateTeamLike {
  const key = abbr.toUpperCase();
  if (leagueId === "wnba") {
    const canonical = resolveWnbaTeamAbbr(abbr);
    const team = getWnbaTeam(canonical);
    if (team) {
      return {
        abbr: canonical,
        name: team.name,
        logoUrl: wnbaTeamLogoUrl(canonical),
      };
    }
    return { abbr: canonical, name: canonical, logoUrl: wnbaTeamLogoUrl(canonical) };
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

  return team ?? { abbr: key, name: key };
}

export function formatSlateDateLabel(slateDate: string | undefined): string | null {
  if (!slateDate) return null;
  return new Date(`${slateDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
