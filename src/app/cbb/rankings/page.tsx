import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";

export const metadata: Metadata = {
  title: "CBB tendencies | Ref Watch",
};

export default function CbbRankingsPage() {
  return <InsightsHubPage leagueId="cbb" defaultTab="tendencies" />;
}
