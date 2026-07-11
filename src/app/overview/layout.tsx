import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { SITE_URL } from "@/lib/site";

const OVERVIEW_LEAGUES = ["nba", "nhl", "nfl", "epl"] as const;

export default async function OverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await Promise.all(
    OVERVIEW_LEAGUES.map((league) => preloadLeagueRefStats(SITE_URL, league)),
  );
  return children;
}
