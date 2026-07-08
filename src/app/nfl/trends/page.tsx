import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NFL league trends | Ref Watch",
  alternates: { canonical: absoluteUrl("/nfl/insights") },
};

export default function NflTrendsPage() {
  return <InsightsHubPage leagueId="nfl" defaultTab="trends" />;
}
