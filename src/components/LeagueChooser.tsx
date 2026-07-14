"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";
import { PRIMARY_LIVE_LEAGUE_IDS } from "@/lib/verified-live-leagues";

type LeagueChooserProps = {
  cards: LeagueOverviewCard[];
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function ChooserCard({ card }: { card: LeagueOverviewCard }) {
  return (
    <Link
      href={card.href}
      className="overview-league-chooser-card overview-league-chooser-card--live-tier rw-focus-ring"
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
  );
}

export function LeagueChooser({ cards }: LeagueChooserProps) {
  const liveOrder = new Map<LeagueId, number>(
    PRIMARY_LIVE_LEAGUE_IDS.map((id, index) => [id, index]),
  );

  const liveCards = cards
    .filter(
      (card) =>
        isDashboardLeagueExposed(card.leagueId) &&
        (PRIMARY_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(card.leagueId),
    )
    .sort((a, b) => (liveOrder.get(a.leagueId) ?? 99) - (liveOrder.get(b.leagueId) ?? 99));

  if (liveCards.length === 0) return null;

  return (
    <section
      className="overview-league-chooser overview-league-chooser--segmented section-block"
      aria-labelledby="overview-league-chooser-heading"
    >
      <div className="overview-section-header">
        <h2 className="overview-section-title" id="overview-league-chooser-heading">
          Choose a league
        </h2>
        <p className="overview-section-lead">
          Start with a verified live hub — pro leagues and college basketball and football.
        </p>
      </div>

      <div className="overview-chooser-tier overview-chooser-tier--live">
        <div className="overview-chooser-tier-head">
          <h3 className="overview-chooser-tier-title">Live competitions</h3>
          <p className="overview-chooser-tier-hint">
            Verified leagues with full hub tooling across seven live competitions.
          </p>
        </div>
        <div className="overview-league-chooser-grid overview-league-chooser-grid--live">
          {liveCards.map((card) => (
            <ChooserCard key={card.leagueId} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
