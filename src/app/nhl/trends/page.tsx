import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nhl", "trends");


export default function NhlTrendsPage() {
  return <InsightsHubPage leagueId="nhl" defaultTab="trends" />;
}
