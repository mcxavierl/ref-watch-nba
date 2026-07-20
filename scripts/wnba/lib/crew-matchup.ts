import { normalizeWnbaAbbr } from "../../../src/lib/wnba/abbr";
import { matchTeamString } from "../../../src/lib/wnba/teams";

function matchupKey(awayTeam: string, homeTeam: string): string {
  return `${awayTeam.toUpperCase()}@${homeTeam.toUpperCase()}`;
}

/** Normalize official city names or ESPN abbrs to canonical matchup keys. */
export function crewMatchupKey(awayTeam: string, homeTeam: string): string | null {
  const away =
    matchTeamString(awayTeam)?.abbr ?? normalizeWnbaAbbr(awayTeam.toUpperCase());
  const home =
    matchTeamString(homeTeam)?.abbr ?? normalizeWnbaAbbr(homeTeam.toUpperCase());
  if (!away || !home) return null;
  return matchupKey(away, home);
}
