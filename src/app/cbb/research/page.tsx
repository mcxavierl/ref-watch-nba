import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cbb", "research");


export default function CbbResearchPage() {
  return <InsightsHubPage leagueId="cbb" defaultTab="findings" />;
}
