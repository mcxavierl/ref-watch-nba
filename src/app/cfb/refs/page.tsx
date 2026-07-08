import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";

export const metadata: Metadata = {
  title: "CFB referees | Ref Watch",
};

export default function CfbRefsPage() {
  return <RefsHubPage leagueId="cfb" />;
}
