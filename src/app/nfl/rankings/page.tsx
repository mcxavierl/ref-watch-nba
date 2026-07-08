import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NFL official tendency index | Ref Watch",
  alternates: { canonical: absoluteUrl("/nfl/insights") },
};

export default function NflRankingsPage() {
  return <InsightsHubPage leagueId="nfl" defaultTab="tendencies" />;
}
