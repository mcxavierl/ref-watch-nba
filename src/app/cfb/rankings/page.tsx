import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cfb", "rankings");


export default function CfbRankingsPage() {
  return <InsightsHubPage leagueId="cfb" defaultTab="tendencies" />;
}
