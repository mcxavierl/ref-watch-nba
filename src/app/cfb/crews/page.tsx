import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cfb", "crews");


export default function CfbCrewsPage() {
  return <RefsHubPage leagueId="cfb" defaultTab="crews" />;
}
