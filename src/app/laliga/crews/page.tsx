import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("laliga", "crews");


export default function EplCrewsPage() {
  return <RefsHubPage leagueId="laliga" defaultTab="crews" />;
}
