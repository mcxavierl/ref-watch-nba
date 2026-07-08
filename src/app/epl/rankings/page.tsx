import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "EPL official tendency index | Ref Watch",
  alternates: { canonical: absoluteUrl("/epl/insights") },
};

export default function EplRankingsPage() {
  return <InsightsHubPage leagueId="epl" defaultTab="tendencies" />;
}
