import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NHL league trends | Ref Watch",
  alternates: { canonical: absoluteUrl("/nhl/insights") },
};

export default function NhlTrendsPage() {
  return <InsightsHubPage leagueId="nhl" defaultTab="trends" />;
}
