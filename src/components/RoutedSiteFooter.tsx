import { SiteFooter } from "@/components/SiteFooter";
import { leagueFromPathname } from "@/lib/leagues";

type FooterLeague = "nba" | "nhl" | "epl" | "cbb" | "cfb";

function footerLeagueForPath(pathname: string): FooterLeague {
  const league = leagueFromPathname(pathname);
  if (league === "nhl") return "nhl";
  if (league === "epl" || league === "laliga") return "epl";
  if (league === "cbb") return "cbb";
  if (league === "cfb") return "cfb";
  return "nba";
}

/** Server-only: pick one footer — client wrappers rendered all five and blew Worker CPU. */
export function RoutedSiteFooter({ pathname }: { pathname: string }) {
  return <SiteFooter league={footerLeagueForPath(pathname)} />;
}
