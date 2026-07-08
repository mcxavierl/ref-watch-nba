import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";

export const metadata: Metadata = {
  title: "CBB findings | Ref Watch",
};

export default function CbbResearchPage() {
  return <InsightsHubPage leagueId="cbb" defaultTab="findings" />;
}
