import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nhl", "rankings");


export default function NhlRankingsPage() {
  return <InsightsHubPage leagueId="nhl" defaultTab="tendencies" />;
}
