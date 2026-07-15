import { normalizeAppPathname } from "@/lib/json-asset-guards";
import { isOverviewPath, isNcaaPath, leagueFromPathname } from "@/lib/leagues";

export type FooterLeague =
  | "overview"
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb";

const FOOTER_LEAGUES = new Set<FooterLeague>([
  "overview",
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
]);

function isFooterLeague(value: string): value is FooterLeague {
  return FOOTER_LEAGUES.has(value as FooterLeague);
}

/** Resolve footer copy from the active route (works on static pages via client pathname). */
export function footerLeagueForPath(pathname: string): FooterLeague {
  const path = normalizeAppPathname(pathname);
  if (isOverviewPath(path)) return "overview";
  if (path.startsWith("/cfb")) return "cfb";
  if (path.startsWith("/cbb")) return "cbb";
  if (isNcaaPath(path)) return "cbb";

  const league = leagueFromPathname(path);
  if (isFooterLeague(league)) return league;
  return "overview";
}
