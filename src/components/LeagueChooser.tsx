"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";

type LeagueChooserProps = {
  cards: LeagueOverviewCard[];
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

const CHOOSER_LEAGUE_ORDER: LeagueId[] = ["nba", "nhl", "nfl", "epl", "laliga"];

export function LeagueChooser({ cards }: LeagueChooserProps) {
  const sortedCards = [...cards].sort(
    (a, b) => CHOOSER_LEAGUE_ORDER.indexOf(a.leagueId) - CHOOSER_LEAGUE_ORDER.indexOf(b.leagueId),
  );

  return (
    <section className="overview-league-chooser section-block" aria-labelledby="overview-league-chooser-heading">
      <div className="overview-section-header">
        <h2 className="overview-section-title" id="overview-league-chooser-heading">
          Choose a league
        </h2>
        <p className="overview-section-lead">
          Jump into tonight&apos;s slate, ref rankings, crew matrices, and whistle analytics for each
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
                <span className="overview-league-chooser-label">{card.label}</span>
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
