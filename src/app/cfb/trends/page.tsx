import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cfb", "trends");


export default function CfbTrendsPage() {
  return <InsightsHubPage leagueId="cfb" defaultTab="trends" />;
}
