import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nba", "rankings");


export default function NbaRankingsPage() {
  return <InsightsHubPage leagueId="nba" defaultTab="tendencies" />;
}
