import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NBA referees & crews | Ref Watch",
  description:
    "Browse every NBA referee and recurring crew in the Ref Watch dataset.",
  alternates: { canonical: absoluteUrl("/refs") },
};

export default function RefsIndexPage() {
  return <RefsHubPage leagueId="nba" />;
}
