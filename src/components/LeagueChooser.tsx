"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";
import { isNcaaConferenceGatedLeague } from "@/lib/ncaa-conference-gate";
import {
  isNcaaConferenceGatedLive,
  PRIMARY_LIVE_LEAGUE_IDS,
} from "@/lib/verified-live-leagues";

type LeagueChooserProps = {
  cards: LeagueOverviewCard[];
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

type ChooserCardProps = {
  card: LeagueOverviewCard;
  variant: "live" | "ncaa";
};

function ChooserCard({ card, variant }: ChooserCardProps) {
  const isNcaa = variant === "ncaa";

  return (
    <Link
      href={card.href}
      className={`overview-league-chooser-card rw-focus-ring${
        isNcaa ? " overview-league-chooser-card--ncaa-tier" : " overview-league-chooser-card--live-tier"
      }`}
      data-league={card.leagueId}
    >
      <span className="overview-league-chooser-top">
        <span className="overview-league-chooser-mark" aria-hidden>
          <LeagueNavMark league={card.leagueId as LeagueId} active={false} />
        </span>
        <span className="overview-league-chooser-body">
          <span className="overview-league-chooser-label-row">
            <span className="overview-league-chooser-label">{card.label}</span>
            {isNcaa ? (
              <span className="overview-limited-coverage-badge">Limited coverage</span>
            ) : null}
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
  const visibleCards = cards.filter((card) => isDashboardLeagueExposed(card.leagueId));
  const liveOrder = new Map<LeagueId, number>(
    PRIMARY_LIVE_LEAGUE_IDS.map((id, index) => [id, index]),
  );

  const liveCards = visibleCards
    .filter((card) => {
      if (!(PRIMARY_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(card.leagueId)) {
        return false;
      }
      if (isNcaaConferenceGatedLeague(card.leagueId)) {
        return isNcaaConferenceGatedLive(card.leagueId);
      }
      return true;
    })
    .sort((a, b) => (liveOrder.get(a.leagueId) ?? 99) - (liveOrder.get(b.leagueId) ?? 99));

  const ncaaCards = visibleCards
    .filter(
      (card) =>
        isNcaaConferenceGatedLeague(card.leagueId) &&
        !isNcaaConferenceGatedLive(card.leagueId),
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  if (liveCards.length === 0 && ncaaCards.length === 0) return null;

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
          Start with a verified live hub. College basketball joins the pro leagues when key-conference data is available.
        </p>
      </div>

      {liveCards.length > 0 ? (
        <div className="overview-chooser-tier overview-chooser-tier--live">
          <div className="overview-chooser-tier-head">
            <h3 className="overview-chooser-tier-title">Live competitions</h3>
            <p className="overview-chooser-tier-hint">
              Verified leagues with full hub tooling, including live NCAA basketball.
            </p>
          </div>
          <div className="overview-league-chooser-grid overview-league-chooser-grid--live">
            {liveCards.map((card) => (
              <ChooserCard key={card.leagueId} card={card} variant="live" />
            ))}
          </div>
        </div>
      ) : null}

      {ncaaCards.length > 0 ? (
        <div className="overview-chooser-tier overview-chooser-tier--ncaa">
          <div className="overview-chooser-tier-head">
            <h3 className="overview-chooser-tier-title">NCAA coverage (limited)</h3>
            <p className="overview-chooser-tier-hint">
              Key conferences only, secondary to live pro infrastructure.
            </p>
          </div>
          <div className="overview-league-chooser-grid overview-league-chooser-grid--ncaa">
            {ncaaCards.map((card) => (
              <ChooserCard key={card.leagueId} card={card} variant="ncaa" />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
