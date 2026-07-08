import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "EPL research findings | Ref Watch",
  alternates: { canonical: absoluteUrl("/epl/insights") },
};

export default function EplResearchPage() {
  return <InsightsHubPage leagueId="epl" defaultTab="findings" />;
}
