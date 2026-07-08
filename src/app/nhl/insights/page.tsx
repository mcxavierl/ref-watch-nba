import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NHL insights | Ref Watch",
  description: "NHL official tendencies, league trends, and research findings.",
  alternates: { canonical: absoluteUrl("/nhl/insights") },
};

export default function NhlInsightsPage() {
  return <InsightsHubPage leagueId="nhl" />;
}
