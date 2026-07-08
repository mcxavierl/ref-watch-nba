import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("epl", "trends");


export default function EplTrendsPage() {
  return <InsightsHubPage leagueId="epl" defaultTab="trends" />;
}
