import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cbb", "refs");


export default function CbbRefsPage() {
  return <RefsHubPage leagueId="cbb" />;
}
