import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";

export const metadata: Metadata = {
  title: "NFL officials | Ref Watch",
  description: "Browse NFL officials in the Ref Watch dataset.",
};

export default function NflRefsPage() {
  return <RefsHubPage leagueId="nfl" />;
}
