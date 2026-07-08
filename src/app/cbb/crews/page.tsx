import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cbb", "crews");


export default function CbbCrewsPage() {
  return <RefsHubPage leagueId="cbb" defaultTab="crews" />;
}
