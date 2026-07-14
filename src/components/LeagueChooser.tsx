"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";
import {
  COLLEGE_LIVE_LEAGUE_IDS,
  isCollegeLiveLeague,
  isProOnlyLiveLeague,
  PRO_ONLY_LIVE_LEAGUE_IDS,
} from "@/lib/verified-live-leagues";

type LeagueChooserProps = {
  cards: LeagueOverviewCard[];
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function ChooserCard({ card }: { card: LeagueOverviewCard }) {
  const pending = !card.analyticsUnlocked;

  return (
    <Link
      href={pending ? (card.auditHref ?? card.href) : card.href}
      className={`overview-league-chooser-card overview-league-chooser-card--live-tier rw-focus-ring${
        pending ? " overview-league-chooser-card--pending" : ""
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
          </span>
          <span className="overview-league-chooser-meta">
            {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
          </span>
          {pending ? (
            <span className="overview-league-chooser-pending">
              {card.auditPendingLabel ?? "Pending Verification"} — hub locked
            </span>
          ) : null}
        </span>
      </span>
      <span className="overview-league-chooser-cta">
        {pending ? "View audit status" : "Open hub"}
        <ArrowRight aria-hidden />
      </span>
    </Link>
  );
}

export function LeagueChooser({ cards }: LeagueChooserProps) {
  const proOrder = new Map<LeagueId, number>(
    PRO_ONLY_LIVE_LEAGUE_IDS.map((id, index) => [id, index]),
  );
  const collegeOrder = new Map<LeagueId, number>(
    COLLEGE_LIVE_LEAGUE_IDS.map((id, index) => [id, index]),
  );

  const visibleCards = cards.filter((card) => isDashboardLeagueExposed(card.leagueId));

  const proCards = visibleCards
    .filter((card) => isProOnlyLiveLeague(card.leagueId))
    .sort((a, b) => (proOrder.get(a.leagueId) ?? 99) - (proOrder.get(b.leagueId) ?? 99));

  const collegeCards = visibleCards
    .filter((card) => isCollegeLiveLeague(card.leagueId))
    .sort(
      (a, b) => (collegeOrder.get(a.leagueId) ?? 99) - (collegeOrder.get(b.leagueId) ?? 99),
    );

  if (proCards.length === 0 && collegeCards.length === 0) return null;

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

      {proCards.length > 0 ? (
        <div className="overview-chooser-tier overview-chooser-tier--live">
          <div className="overview-chooser-tier-head">
            <h3 className="overview-chooser-tier-title">Live competitions</h3>
            <p className="overview-chooser-tier-hint">
              Verified pro leagues with full hub tooling across five live competitions.
            </p>
          </div>
          <div className="overview-league-chooser-grid overview-league-chooser-grid--live">
            {proCards.map((card) => (
              <ChooserCard key={card.leagueId} card={card} />
            ))}
          </div>
        </div>
      ) : null}

      {collegeCards.length > 0 ? (
        <div className="overview-chooser-tier overview-chooser-tier--college">
          <div className="overview-chooser-tier-head">
            <h3 className="overview-chooser-tier-title">College sports</h3>
            <p className="overview-chooser-tier-hint">
              Live NCAA basketball and football hubs with verified key-conference coverage.
            </p>
          </div>
          <div className="overview-league-chooser-grid overview-league-chooser-grid--college">
            {collegeCards.map((card) => (
              <ChooserCard key={card.leagueId} card={card} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
