import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { buildCrossLeagueOverview } from "@/lib/cross-league-overview";
import { catalogCompetitionCount } from "@/lib/league-catalog";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const OVERVIEW_LEAGUES = ["nba", "nhl", "nfl", "epl"] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "Multi-league overview",
  description:
    "Cross-league referee analytics for the NBA, NHL, NFL, and Premier League. Dataset totals, whistle leaders, and an expanding competition catalog.",
  path: "/overview",
  keywords: [
    "referee analytics",
    "multi-league refs",
    "NBA NHL NFL EPL officials",
    "whistle tendencies",
  ],
});

export default async function OverviewPage() {
  await Promise.all(
    OVERVIEW_LEAGUES.map((league) => preloadLeagueRefStats(SITE_URL, league)),
  );
  const data = buildCrossLeagueOverview(catalogCompetitionCount());

  return (
    <div className="page-shell overview-shell">
      <OverviewDashboard data={data} />
    </div>
  );
}
