"use client";

import { LeagueHubCard } from "@/components/LeagueHubCard";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { getOverviewHubLeagueOrder } from "@/lib/active-leagues-by-season";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";

type LeagueHubsProps = {
  cards: LeagueOverviewCard[];
  /** When omitted, renders the card grid only (no section chrome). */
  showSectionHeader?: boolean;
  placement?: "primary" | "default";
};

export function LeagueHubs({
  cards,
  showSectionHeader = true,
  placement = "default",
}: LeagueHubsProps) {
  const hubOrder = new Map<LeagueId, number>(
    getOverviewHubLeagueOrder().map((id, index) => [id, index]),
  );

  const sortedCards = cards
    .filter((card) => isDashboardLeagueExposed(card.leagueId))
    .sort((a, b) => (hubOrder.get(a.leagueId) ?? 99) - (hubOrder.get(b.leagueId) ?? 99));

  if (sortedCards.length === 0) return null;

  const grid = (
    <div className="overview-league-chooser-grid league-hubs-grid grid auto-rows-fr">
      {sortedCards.map((card) => (
        <LeagueHubCard key={card.leagueId} card={card} />
      ))}
    </div>
  );

  if (!showSectionHeader) return grid;

  const sectionClass = [
    "overview-league-chooser overview-league-chooser--segmented section-block",
    placement === "primary" ? "overview-league-chooser--primary" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClass} aria-labelledby="overview-league-chooser-heading">
      <div className="overview-section-header overview-section-header--primary">
        <h2 className="overview-section-title" id="overview-league-chooser-heading">
          League hubs
        </h2>
      </div>
      {grid}
    </section>
  );
}
