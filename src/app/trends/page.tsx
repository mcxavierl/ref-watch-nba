import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NBA league trends | Ref Watch",
  description: "Five-season NBA scoring and whistle trends from Ref Watch baselines.",
  alternates: { canonical: absoluteUrl("/insights") },
};

export default function NbaTrendsPage() {
  return <InsightsHubPage leagueId="nba" defaultTab="trends" />;
}
