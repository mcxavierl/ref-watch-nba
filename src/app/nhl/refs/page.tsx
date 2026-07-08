import type { Metadata } from "next";
import { RefsHubPage } from "@/components/RefsHubPage";

export const metadata: Metadata = {
  title: "NHL officials | Ref Watch",
  description:
    "Browse NHL referees in the Ref Watch tendency index. Linesmen appear on crews but are excluded from analytics.",
};

export default function NhlRefsIndexPage() {
  return <RefsHubPage leagueId="nhl" />;
}
