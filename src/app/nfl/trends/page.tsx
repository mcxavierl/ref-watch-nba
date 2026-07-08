import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nfl", "trends");


export default function NflTrendsPage() {
  return <InsightsHubPage leagueId="nfl" defaultTab="trends" />;
}
