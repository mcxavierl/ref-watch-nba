import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_HOME_PATH } from "@/lib/leagues";

export const metadata: Metadata = buildPageMetadata({
  title: "Multi-league overview",
  description:
    "Cross-league referee analytics for the NBA, NHL, NFL, Premier League, and La Liga. Standout ref×team splits, whistle outliers, and an expanding competition catalog.",
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
