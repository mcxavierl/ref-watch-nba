import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nba", "crews");


export default function NbaCrewsPage() {
  return <RefsHubPage leagueId="nba" defaultTab="crews" />;
}
