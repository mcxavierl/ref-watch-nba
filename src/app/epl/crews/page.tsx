import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "EPL crew dynamics | Ref Watch",
  alternates: { canonical: absoluteUrl("/epl/refs") },
};

export default function EplCrewsPage() {
  return <RefsHubPage leagueId="epl" defaultTab="crews" />;
}
