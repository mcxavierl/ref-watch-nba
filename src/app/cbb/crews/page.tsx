import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";

export const metadata: Metadata = {
  title: "CBB crews | Ref Watch",
};

export default function CbbCrewsPage() {
  return <RefsHubPage leagueId="cbb" defaultTab="crews" />;
}
