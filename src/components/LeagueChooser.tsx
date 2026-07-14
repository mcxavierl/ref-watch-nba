"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";

type LeagueChooserProps = {
  cards: LeagueOverviewCard[];
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function LeagueChooser({ cards }: LeagueChooserProps) {
  const visibleCards = cards.filter((card) => isDashboardLeagueExposed(card.leagueId));
  const leagueOrder = new Map<LeagueId, number>(
    VERIFIED_LIVE_LEAGUE_IDS.map((id, index) => [id, index]),
  );
  const sortedCards = [...visibleCards].sort(
    (a, b) =>
      (leagueOrder.get(a.leagueId) ?? 99) - (leagueOrder.get(b.leagueId) ?? 99),
  );

  if (sortedCards.length === 0) return null;

  return (
    <section className="overview-league-chooser section-block" aria-labelledby="overview-league-chooser-heading">
      <div className="overview-section-header">
        <h2 className="overview-section-title" id="overview-league-chooser-heading">
          Choose a league
        </h2>
        <p className="overview-section-lead">
          Jump into tonight&apos;s games, ref rankings, crew matrices, and whistle analytics for each
          live competition.
        </p>
      </div>

      <div className="overview-league-chooser-grid">
        {sortedCards.map((card) => (
          <Link
            key={card.leagueId}
            href={card.href}
            className="overview-league-chooser-card"
            data-league={card.leagueId}
          >
            <span className="overview-league-chooser-top">
              <span className="overview-league-chooser-mark" aria-hidden>
                <LeagueNavMark league={card.leagueId as LeagueId} active={false} />
              </span>
              <span className="overview-league-chooser-body">
                <span className="overview-league-chooser-label-row">
                  <span className="overview-league-chooser-label">{card.label}</span>
                </span>
                <span className="overview-league-chooser-meta">
                  {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
                </span>
              </span>
            </span>
            <span className="overview-league-chooser-cta">
              Open hub
              <ArrowRight aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
