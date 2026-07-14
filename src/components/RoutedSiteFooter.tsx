import { SiteFooter, type FooterLeague } from "@/components/SiteFooter";
import { leagueFromPathname } from "@/lib/leagues";

function footerLeagueForPath(pathname: string): FooterLeague {
  const league = leagueFromPathname(pathname);
  if (league === "nfl") return "nfl";
  if (league === "nhl") return "nhl";
  if (league === "laliga") return "laliga";
  if (league === "epl") return "epl";
  if (league === "cbb") return "cbb";
  if (league === "cfb") return "cfb";
  return "nba";
}

/** Server-only: pick one footer — client wrappers rendered all five and blew Worker CPU. */
export function RoutedSiteFooter({ pathname }: { pathname: string }) {
  return <SiteFooter league={footerLeagueForPath(pathname)} />;
}
