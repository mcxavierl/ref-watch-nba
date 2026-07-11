import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("laliga", "trends");


export default function EplTrendsPage() {
  return <InsightsHubPage leagueId="laliga" defaultTab="trends" />;
}
