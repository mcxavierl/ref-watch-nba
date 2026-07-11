import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("laliga", "rankings");


export default function EplRankingsPage() {
  return <InsightsHubPage leagueId="laliga" defaultTab="tendencies" />;
}
