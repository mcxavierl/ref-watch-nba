import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("epl", "rankings");


export default function EplRankingsPage() {
  return <InsightsHubPage leagueId="epl" defaultTab="tendencies" />;
}
