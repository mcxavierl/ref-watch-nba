import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NBA crew dynamics | Ref Watch",
  description: "Recurring NBA referee crews ranked by pace, whistle rate, and dominance.",
  alternates: { canonical: absoluteUrl("/refs") },
};

export default function NbaCrewsPage() {
  return <RefsHubPage leagueId="nba" defaultTab="crews" />;
}
