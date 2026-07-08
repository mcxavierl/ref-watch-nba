import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NBA research findings | Ref Watch",
  description: "Ranked historical patterns from the NBA referee dataset.",
  alternates: { canonical: absoluteUrl("/insights") },
};

export default function ResearchHubPage() {
  return <InsightsHubPage leagueId="nba" defaultTab="findings" />;
}
