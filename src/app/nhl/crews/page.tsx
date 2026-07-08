import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nhl", "crews");


export default function NhlCrewsPage() {
  return <RefsHubPage leagueId="nhl" defaultTab="crews" />;
}
