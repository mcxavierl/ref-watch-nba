import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nhl", "research");


export default function NhlResearchHubPage() {
  return <InsightsHubPage leagueId="nhl" defaultTab="findings" />;
}
