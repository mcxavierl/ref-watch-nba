import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NFL crew dynamics | Ref Watch",
  alternates: { canonical: absoluteUrl("/nfl/refs") },
};

export default function NflCrewsPage() {
  return <RefsHubPage leagueId="nfl" defaultTab="crews" />;
}
