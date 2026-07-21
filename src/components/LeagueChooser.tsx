"use client";

import { LeagueHubs } from "@/components/LeagueHubs";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";

type LeagueChooserProps = {
  cards: LeagueOverviewCard[];
  placement?: "primary" | "default";
};

export function LeagueChooser({ cards, placement = "default" }: LeagueChooserProps) {
  return <LeagueHubs cards={cards} placement={placement} />;
}
