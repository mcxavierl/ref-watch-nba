import type { Metadata } from "next";
import { InsightsHubPage } from "@/components/InsightsHubPage";

export const metadata: Metadata = {
  title: "CFB tendencies | Ref Watch",
};

export default function CfbRankingsPage() {
  return <InsightsHubPage leagueId="cfb" defaultTab="tendencies" />;
}
