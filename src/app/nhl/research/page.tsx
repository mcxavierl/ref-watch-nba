import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NHL research findings | Ref Watch",
  alternates: { canonical: absoluteUrl("/nhl/insights") },
};

export default function NhlResearchHubPage() {
  return <InsightsHubPage leagueId="nhl" defaultTab="findings" />;
}
