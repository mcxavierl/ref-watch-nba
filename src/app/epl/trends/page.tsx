import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "EPL league trends | Ref Watch",
  alternates: { canonical: absoluteUrl("/epl/insights") },
};

export default function EplTrendsPage() {
  return <InsightsHubPage leagueId="epl" defaultTab="trends" />;
}
