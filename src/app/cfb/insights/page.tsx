import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";

export const metadata: Metadata = {
  title: "CFB insights | Ref Watch",
};

export default function CfbInsightsPage() {
  return <InsightsHubPage leagueId="cfb" />;
}
