import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("laliga", "research");


export default function EplResearchPage() {
  return <InsightsHubPage leagueId="laliga" defaultTab="findings" />;
}
