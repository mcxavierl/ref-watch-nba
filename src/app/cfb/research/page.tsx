import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cfb", "research");


export default function CfbResearchPage() {
  return <InsightsHubPage leagueId="cfb" defaultTab="findings" />;
}
