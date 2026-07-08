import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";

export const metadata: Metadata = {
  title: "EPL referees | Ref Watch",
  description: "Browse Premier League referees in the Ref Watch dataset.",
};

export default function EplRefsPage() {
  return <RefsHubPage leagueId="epl" />;
}
