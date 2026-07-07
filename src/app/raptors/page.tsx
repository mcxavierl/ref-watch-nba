import type { Metadata } from "next";
import { TeamCrewPage } from "@/components/TeamCrewPage";

export const metadata: Metadata = {
  title: "Raptors ref crew splits — Ref Watch NBA",
  description:
    "Toronto Raptors historical splits by referee crew — O/U lean, foul differential, and home/away records.",
};

const config = {
  teamLabel: "Toronto Raptors",
  teamAbbr: "TOR",
  accentClass: "text-raptors",
  refLinkHoverClass: "hover:text-raptors",
  whistleTone: "raptors" as const,
  splitsKey: "raptorsSplits" as const,
  methodologyTitle: "How to read Raptors splits",
};

export default function RaptorsPage() {
  return <TeamCrewPage config={config} />;
}
