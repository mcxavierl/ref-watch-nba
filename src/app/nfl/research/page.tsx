import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NFL research findings | Ref Watch",
  alternates: { canonical: absoluteUrl("/nfl/insights") },
};

export default function NflResearchPage() {
  return <InsightsHubPage leagueId="nfl" defaultTab="findings" />;
}
