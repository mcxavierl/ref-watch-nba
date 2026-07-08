import { RefsHubPage } from "@/components/RefsHubPage";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cfb", "refs");


export default function CfbRefsPage() {
  return <RefsHubPage leagueId="cfb" />;
}
