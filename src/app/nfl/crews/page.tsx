import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("nfl", "crews");


export default function NflCrewsPage() {
  return <RefsHubPage leagueId="nfl" defaultTab="crews" />;
}
