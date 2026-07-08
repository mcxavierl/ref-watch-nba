import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cbb", "rankings");


export default function CbbRankingsPage() {
  return <InsightsHubPage leagueId="cbb" defaultTab="tendencies" />;
}
