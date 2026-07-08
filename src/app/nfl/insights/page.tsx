import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NFL insights | Ref Watch",
  alternates: { canonical: absoluteUrl("/nfl/insights") },
};

export default function NflInsightsPage() {
  return <InsightsHubPage leagueId="nfl" />;
}
