import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";

export const metadata: Metadata = {
  title: "CBB trends | Ref Watch",
};

export default function CbbTrendsPage() {
  return <InsightsHubPage leagueId="cbb" defaultTab="trends" />;
}
