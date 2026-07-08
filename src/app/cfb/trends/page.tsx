import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";

export const metadata: Metadata = {
  title: "CFB trends | Ref Watch",
};

export default function CfbTrendsPage() {
  return <InsightsHubPage leagueId="cfb" defaultTab="trends" />;
}
