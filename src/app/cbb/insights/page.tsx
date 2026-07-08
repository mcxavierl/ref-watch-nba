import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cbb", "insights");


export default function CbbInsightsPage() {
  return <InsightsHubPage leagueId="cbb" />;
}
