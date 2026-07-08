import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nba", "research");


export default function ResearchHubPage() {
  return <InsightsHubPage leagueId="nba" defaultTab="findings" />;
}
