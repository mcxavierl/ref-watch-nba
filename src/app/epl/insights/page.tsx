import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "EPL insights | Ref Watch",
  alternates: { canonical: absoluteUrl("/epl/insights") },
};

export default function EplInsightsPage() {
  return <InsightsHubPage leagueId="epl" />;
}
