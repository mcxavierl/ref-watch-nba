import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cfb", "insights");


export default function CfbInsightsPage() {
  return <InsightsHubPage leagueId="cfb" />;
}
