import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NHL crew dynamics | Ref Watch",
  description: "Recurring NHL officiating crews ranked by pace, penalties, and dominance.",
  alternates: { canonical: absoluteUrl("/nhl/refs") },
};

export default function NhlCrewsPage() {
  return <RefsHubPage leagueId="nhl" defaultTab="crews" />;
}
