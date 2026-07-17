"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { ESTIMATED_LEAGUE_AVERAGE_TOOLTIP } from "@/config/methodology";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";
import { formatLeaguePaceValue } from "@/lib/league-pace-bars";
import { OVERVIEW_HUB_LEAGUE_IDS } from "@/lib/verified-live-leagues";

type LeagueChooserProps = {
  cards: LeagueOverviewCard[];
  placement?: "primary" | "default";
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
          <span className="overview-league-chooser-meta tabular-nums">
            {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
          </span>
          {pending ? (
            <span className="overview-league-chooser-pending">
              {card.auditPendingLabel ?? "Pending Verification"} - hub locked
            </span>
          ) : (
            <span className="overview-league-chooser-metrics tabular-nums">
              <span className="overview-league-chooser-metric">
                <span className="overview-league-chooser-metric-label">{card.whistleLabel}</span>
                <strong className="tabular-nums">{formatLeaguePaceValue(card.whistlePerGame)}</strong>
              </span>
              <span className="overview-league-chooser-metric">
                <span className="overview-league-chooser-metric-label">
                  {card.scoreLabel}
                  {card.scoreEstimated ? (
                    <MetricInfoHint
                      hint={ESTIMATED_LEAGUE_AVERAGE_TOOLTIP}
                      className="overview-league-chooser-estimated"
                    >
                      <span className="overview-league-chooser-estimated-mark">(est.)</span>
                    </MetricInfoHint>
                  ) : null}
                </span>
                <strong className="tabular-nums">{formatLeaguePaceValue(card.scorePerGame)}</strong>
              </span>
            </span>
          )}
        </span>
      </span>
      <span className="overview-league-chooser-cta">
        {pending ? "View audit status" : "Open hub"}
        <ArrowRight aria-hidden />
      </span>
    </Link>
  );
}

export function LeagueChooser({ cards, placement = "default" }: LeagueChooserProps) {
  const hubOrder = new Map<LeagueId, number>(
    OVERVIEW_HUB_LEAGUE_IDS.map((id, index) => [id, index]),
  );

  const sortedCards = cards
    .filter((card) => isDashboardLeagueExposed(card.leagueId))
    .sort((a, b) => (hubOrder.get(a.leagueId) ?? 99) - (hubOrder.get(b.leagueId) ?? 99));

  if (sortedCards.length === 0) return null;

  const sectionClass = [
    "overview-league-chooser overview-league-chooser--segmented section-block",
    placement === "primary" ? "overview-league-chooser--primary" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={sectionClass}
      aria-labelledby="overview-league-chooser-heading"
    >
      <div className="overview-section-header overview-section-header--primary">
        <h2 className="overview-section-title" id="overview-league-chooser-heading">
          League hubs
        </h2>
      </div>

      <div className="overview-league-chooser-grid">
        {sortedCards.map((card) => (
          <ChooserCard key={card.leagueId} card={card} />
        ))}
      </div>
    </section>
  );
}
