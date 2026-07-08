import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NBA official tendency index | Ref Watch",
  description: "Sortable NBA official tendency index by scoring, whistle rate, and over-rate.",
  alternates: { canonical: absoluteUrl("/insights") },
};

export default function NbaRankingsPage() {
  return <InsightsHubPage leagueId="nba" defaultTab="tendencies" />;
}
