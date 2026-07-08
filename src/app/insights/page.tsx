import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NBA insights | Ref Watch",
  description:
    "NBA official tendencies, league trends, and ranked research findings.",
  alternates: { canonical: absoluteUrl("/insights") },
};

export default function NbaInsightsPage() {
  return <InsightsHubPage leagueId="nba" />;
}
