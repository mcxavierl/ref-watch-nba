import type { LeagueId } from "@/lib/leagues";

/** Default league nation for domestic competitions (proxy for team origin). */
const LEAGUE_DEFAULT_NATION: Partial<Record<LeagueId, string>> = {
  nba: "USA",
  cbb: "USA",
  cfb: "USA",
  nfl: "USA",
  nhl: "USA",
  epl: "ENG",
  laliga: "ESP",
};

/** EPL clubs with non-England heritage for international proxy analysis. */
const EPL_TEAM_NATIONS: Record<string, string> = {
  ARS: "ENG",
  AVL: "ENG",
  BOU: "ENG",
  BRE: "ENG",
  BHA: "ENG",
  CHE: "ENG",
  CRY: "ENG",
  EVE: "ENG",
  FUL: "ENG",
  IPS: "ENG",
  LEI: "ENG",
  LIV: "ENG",
  MCI: "ENG",
  MUN: "ENG",
  NEW: "ENG",
  NFO: "ENG",
  SOU: "ENG",
  TOT: "ENG",
  WHU: "ENG",
  WOL: "ENG",
};

const LALIGA_TEAM_NATIONS: Record<string, string> = {
  ATH: "ESP",
  ATM: "ESP",
  BAR: "ESP",
  BET: "ESP",
  CEL: "ESP",
  ESP: "ESP",
  GET: "ESP",
  GIR: "ESP",
  LAS: "ESP",
  LEG: "ESP",
  MLL: "ESP",
  OSA: "ESP",
  RAY: "ESP",
  RMA: "ESP",
  RSO: "ESP",
  SEV: "ESP",
  VAL: "ESP",
  VIL: "ESP",
};

export function teamNationForLeague(leagueId: LeagueId, teamAbbr: string): string | null {
  const abbr = teamAbbr.toUpperCase();
  if (leagueId === "epl") return EPL_TEAM_NATIONS[abbr] ?? "ENG";
  if (leagueId === "laliga") return LALIGA_TEAM_NATIONS[abbr] ?? "ESP";
  return LEAGUE_DEFAULT_NATION[leagueId] ?? null;
}

/** Soccer leagues where referee-vs-team nation correlation is most meaningful. */
export const INTERNATIONAL_INSIGHT_LEAGUES: LeagueId[] = ["epl", "laliga"];
