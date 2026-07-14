"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { NcaaAuditStatusPill } from "@/components/NcaaAuditStatusPill";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";

type LeagueChooserProps = {
  cards: LeagueOverviewCard[];
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

const CHOOSER_LEAGUE_ORDER: LeagueId[] = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
];

function isAuditPendingCard(card: LeagueOverviewCard): boolean {
  return card.verificationState === "audit-in-progress";
}

export function LeagueChooser({ cards }: LeagueChooserProps) {
  const visibleCards = cards.filter((card) => isDashboardLeagueExposed(card.leagueId));
  const sortedCards = [...visibleCards].sort(
    (a, b) => CHOOSER_LEAGUE_ORDER.indexOf(a.leagueId) - CHOOSER_LEAGUE_ORDER.indexOf(b.leagueId),
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
          <span className="overview-section-lead-ncaa-note">
            {" "}
            NCAA hubs stay locked until the integrity audit completes.
          </span>
        </p>
      </div>

      <div className="overview-league-chooser-grid">
        {sortedCards.map((card) => {
          const pending = isAuditPendingCard(card);

          const inner = (
            <>
              <span className="overview-league-chooser-top">
                <span className="overview-league-chooser-mark" aria-hidden>
                  <LeagueNavMark league={card.leagueId as LeagueId} active={false} />
                </span>
                <span className="overview-league-chooser-body">
                  <span className="overview-league-chooser-label-row">
                    <span className="overview-league-chooser-label">{card.label}</span>
                    {pending && card.auditCoveragePct != null && card.auditHref ? (
                      <NcaaAuditStatusPill
                        coveragePct={card.auditCoveragePct}
                        auditHref={card.auditHref}
                        pendingLabel={card.auditPendingLabel}
                        className="overview-league-chooser-audit-pill"
                        asLabel
                      />
                    ) : null}
                  </span>
                  <span className="overview-league-chooser-meta">
                    {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
                  </span>
                  {pending ? (
                    <span className="overview-league-chooser-pending">
                      <Lock aria-hidden className="overview-league-chooser-pending-icon" />
                      {card.auditPendingLabel ?? "Pending Verification"}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="overview-league-chooser-cta">
                {pending ? "View audit status" : "Open hub"}
                <ArrowRight aria-hidden />
              </span>
            </>
          );

          if (pending) {
            return (
              <Link
                key={card.leagueId}
                href={card.auditHref ?? card.href}
                className="overview-league-chooser-card overview-league-chooser-card--pending"
                data-league={card.leagueId}
                data-verification="audit-in-progress"
              >
                {inner}
              </Link>
            );
          }

          return (
            <Link
              key={card.leagueId}
              href={card.href}
              className="overview-league-chooser-card"
              data-league={card.leagueId}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
