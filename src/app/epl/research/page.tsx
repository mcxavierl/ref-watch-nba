import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("epl", "research");


export default function EplResearchPage() {
  return <InsightsHubPage leagueId="epl" defaultTab="findings" />;
}
