import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cbb", "trends");


export default function CbbTrendsPage() {
  return <InsightsHubPage leagueId="cbb" defaultTab="trends" />;
}
