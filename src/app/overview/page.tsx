import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Multi-league overview",
  description:
    "Cross-league referee analytics for the NBA, NHL, NFL, and Premier League. Standout ref×team splits, whistle outliers, and an expanding competition catalog.",
  path: "/overview",
  keywords: [
    "referee analytics",
    "multi-league refs",
    "NBA NHL NFL EPL officials",
    "whistle tendencies",
  ],
});

export default function OverviewPage() {
  const data = loadOverviewSnapshot();

  return (
    <div className="page-shell overview-shell">
      <OverviewDashboard data={data} />
    </div>
  );
}
