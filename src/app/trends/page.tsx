import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nba", "trends");


export default function NbaTrendsPage() {
  return <InsightsHubPage leagueId="nba" defaultTab="trends" />;
}
