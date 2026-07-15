import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_HOME_PATH } from "@/lib/leagues";

export const metadata: Metadata = buildPageMetadata({
  title: "Verified officiating analytics",
  description:
    "Cross-league referee analytics for the NBA, NHL, NFL, Premier League, La Liga, and NCAA. Live league hubs with matrix, rankings, and ref profiles.",
  path: SITE_HOME_PATH,
  keywords: [
    "referee analytics",
    "multi-league refs",
    "NBA NHL NFL EPL officials",
    "whistle tendencies",
  ],
});

export default function HomePage() {
  const data = loadOverviewSnapshot();

  return (
    <div className="page-shell overview-shell">
      <OverviewDashboard data={data} />
    </div>
  );
}
