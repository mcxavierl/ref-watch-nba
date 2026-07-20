import { OG_LEAGUE_ACCENTS } from "@/lib/og-brand";
import type { LeagueId } from "@/lib/leagues";

const LEAGUE_ACCENT_BAR: Partial<Record<LeagueId, string>> = {
  nba: "#006bb6",
  nhl: "#0a4c7a",
  nfl: "#012348",
  epl: "#3d195b",
  laliga: "#c8102e",
  cbb: "#009CDE",
  cfb: "#8B4513",
};

export function leagueAccentColor(leagueId: LeagueId): string {
  return LEAGUE_ACCENT_BAR[leagueId] ?? OG_LEAGUE_ACCENTS[leagueId] ?? "#94a3b8";
}

export function leagueMatchupGlow(leagueId: LeagueId): string {
  switch (leagueId) {
    case "nfl":
      return "#1e4fd4";
    case "epl":
      return "#6b3fa8";
    case "laliga":
      return "#c9a227";
    case "nba":
      return "#ce1141";
    case "nhl":
      return "#003876";
    case "cbb":
      return "#009CDE";
    case "cfb":
      return "#8B4513";
    default:
      return "#94a3b8";
  }
}
