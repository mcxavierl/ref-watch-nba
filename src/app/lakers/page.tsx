import type { Metadata } from "next";
import { TeamCrewPage } from "@/components/TeamCrewPage";

export const metadata: Metadata = {
  title: "Lakers ref crew splits — Ref Watch NBA",
  description:
    "Los Angeles Lakers historical splits by referee crew — O/U lean, foul differential, and home/away records.",
};

const config = {
  teamLabel: "Los Angeles Lakers",
  teamAbbr: "LAL",
  accentClass: "text-lakers",
  refLinkHoverClass: "hover:text-lakers-gold",
  whistleTone: "lakers" as const,
  splitsKey: "lakersSplits" as const,
  methodologyTitle: "How to read Lakers splits",
};

export default function LakersPage() {
  return <TeamCrewPage config={config} />;
}
