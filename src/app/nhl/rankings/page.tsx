import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NHL official tendency index | Ref Watch",
  alternates: { canonical: absoluteUrl("/nhl/insights") },
};

export default function NhlRankingsPage() {
  return <InsightsHubPage leagueId="nhl" defaultTab="tendencies" />;
}
