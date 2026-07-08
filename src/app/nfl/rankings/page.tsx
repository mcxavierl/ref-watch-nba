import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nfl", "rankings");


export default function NflRankingsPage() {
  return <InsightsHubPage leagueId="nfl" defaultTab="tendencies" />;
}
