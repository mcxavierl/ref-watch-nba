import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";

export const metadata: Metadata = {
  title: "CBB referees | Ref Watch",
};

export default function CbbRefsPage() {
  return <RefsHubPage leagueId="cbb" />;
}
