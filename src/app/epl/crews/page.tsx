import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("epl", "crews");


export default function EplCrewsPage() {
  return <RefsHubPage leagueId="epl" defaultTab="crews" />;
}
