import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";

export const metadata: Metadata = {
  title: "CFB findings | Ref Watch",
};

export default function CfbResearchPage() {
  return <InsightsHubPage leagueId="cfb" defaultTab="findings" />;
}
