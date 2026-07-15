import type { LeagueId } from "@/lib/leagues";

/** Research framing — tendencies, not bias attribution. */
export const WC_RESEARCH_PRINCIPLES = [
  "We identify statistical tendencies in officiating patterns, not assign bias.",
  "Referee birthplace and confederation context are descriptive covariates only.",
  "Origin variance measures geopolitical distance - not intent or favoritism.",
  "Every signal passes minimum sample gates with confidence tiers.",
  "Patterns describe historical associations; they do not predict individual outcomes.",
] as const;

export const WC_RESEARCH_HUB = {
  title: "2026 World Cup Officiating Analytics",
  kicker: "Research · FIFA WC 2026",
  headline: "Geopolitical origin variance in international assignments",
  story:
    "Exploratory research correlating referee birth nation with participating team origins. " +
    "Built on cross-league geographic methodology as a proxy until WC crew data is published.",
  href: "/research/world-cup-2026",
  logoSrc: "/assets/logos/fifa-wc-2026.png",
  logoAlt: "FIFA",
} as const;

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
