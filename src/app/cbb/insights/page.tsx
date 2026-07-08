import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";

export const metadata: Metadata = {
  title: "CBB insights | Ref Watch",
};

export default function CbbInsightsPage() {
  return <InsightsHubPage leagueId="cbb" />;
}
