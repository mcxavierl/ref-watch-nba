import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nfl", "research");


export default function NflResearchPage() {
  return <InsightsHubPage leagueId="nfl" defaultTab="findings" />;
}
