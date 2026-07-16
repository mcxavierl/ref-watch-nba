import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import { getTeam as getCfbTeam } from "@/lib/cfb/teams";
import { getTeam as getEplTeam } from "@/lib/epl/teams";
import { getTeam as getLaligaTeam } from "@/lib/laliga/teams";
import { getTeam as getNflTeam, teamFullName as nflTeamFullName } from "@/lib/nfl/teams";
import { getTeam as getNhlTeam } from "@/lib/nhl/teams";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { getTeam as getNbaTeam } from "@/lib/teams";

export type RefProfileTeamLike = {
  abbr: string;
  name: string;
  nbaId?: number;
  logoUrl?: string;
};

export type RefProfileTeamLogoSport =
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb";

export function refProfileTeamLogoSport(leagueId: LeagueId): RefProfileTeamLogoSport {
  if (leagueId === "wnba" || leagueId === "mlb") return "nba";
  return leagueId;
}

export function resolveRefProfileTeam(
  leagueId: LeagueId,
  abbr: string,
): RefProfileTeamLike {
  const key = abbr.toUpperCase();
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

  if (!team) return { abbr: key, name: key };
  if (leagueId === "nfl" && "city" in team) {
    return {
      abbr: team.abbr,
      name: nflTeamFullName(team as Parameters<typeof nflTeamFullName>[0]),
    };
  }
  if ("nbaId" in team && typeof team.nbaId === "number") {
    return { abbr: team.abbr, name: team.name, nbaId: team.nbaId };
  }
  if ("logoUrl" in team && typeof team.logoUrl === "string") {
    return { abbr: team.abbr, name: team.name, logoUrl: team.logoUrl };
  }
  return { abbr: team.abbr, name: team.name };
}

export function refProfileTeamPath(leagueId: LeagueId, abbr: string): string {
  const prefix = LEAGUES[leagueId].pathPrefix;
  return `${prefix}/teams/${abbr.toUpperCase()}`;
}
