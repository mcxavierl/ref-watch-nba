import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";

export const metadata: Metadata = {
  title: "CFB crews | Ref Watch",
};

export default function CfbCrewsPage() {
  return <RefsHubPage leagueId="cfb" defaultTab="crews" />;
}
