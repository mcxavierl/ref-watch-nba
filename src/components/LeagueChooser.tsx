"use client";

import { ArrowRight } from "lucide-react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { isDashboardLeagueExposed } from "@/config/leagues-dashboard";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import type { LeagueOverviewCard } from "@/lib/cross-league-overview";
import type { LeagueId } from "@/lib/leagues";
import { formatLeaguePaceValue } from "@/lib/league-pace-bars";
import {
  isCollegeLiveLeague,
  OVERVIEW_HUB_LEAGUE_IDS,
} from "@/lib/verified-live-leagues";

type LeagueChooserProps = {
  cards: LeagueOverviewCard[];
  placement?: "primary" | "default";
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function ChooserCard({ card }: { card: LeagueOverviewCard }) {
  const pending = !card.analyticsUnlocked;
  const collegeTier = isCollegeLiveLeague(card.leagueId);

  return (
    <PrefetchLink
      href={pending ? (card.auditHref ?? card.href) : card.href}
      className={`overview-league-chooser-card rw-focus-ring flex h-full min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700${
        collegeTier ? " overview-league-chooser-card--college-tier" : ""
      }${pending ? " overview-league-chooser-card--pending" : ""}`}
      data-league={card.leagueId}
    >
      <span className="overview-league-chooser-top flex min-h-0 flex-1 flex-col">
        <span className="overview-league-chooser-mark shrink-0" aria-hidden>
          <LeagueNavMark league={card.leagueId as LeagueId} active={false} />
        </span>
        <span className="overview-league-chooser-body flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <span className="overview-league-chooser-label-row min-w-0">
            {collegeTier ? (
              <span className="overview-league-chooser-scope truncate text-xs">
                College sports
              </span>
            ) : null}
            <span className="overview-league-chooser-label truncate text-sm">
              {collegeTier ? card.shortLabel : card.label}
            </span>
          </span>
          <span className="overview-league-chooser-meta tabular-nums truncate text-xs">
            {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
          </span>
          {pending ? (
            <span className="overview-league-chooser-pending break-words text-xs">
              {card.auditPendingLabel ?? "Pending Verification"} - hub locked
            </span>
          ) : (
            <span className="overview-league-chooser-metrics tabular-nums">
              <span className="overview-league-chooser-metric min-w-0">
                <span className="overview-league-chooser-metric-label whitespace-nowrap text-xs">
                  {card.whistleLabel}
                </span>
                <strong className="shrink-0 font-bold tabular-nums text-sm">
                  {formatLeaguePaceValue(card.whistlePerGame)}
                </strong>
              </span>
              <span className="overview-league-chooser-metric min-w-0">
                <span className="overview-league-chooser-metric-label whitespace-nowrap text-xs">
                  {card.scoreLabel}
                </span>
                <strong className="shrink-0 font-bold tabular-nums text-sm">
                  {formatLeaguePaceValue(card.scorePerGame)}
                </strong>
              </span>
            </span>
          )}
        </span>
      </span>
      <span className="overview-league-chooser-cta mt-auto shrink-0 text-xs uppercase tracking-wide">
        {pending ? "View audit status" : "Open hub"}
        <ArrowRight aria-hidden />
      </span>
    </PrefetchLink>
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

      <div className="overview-league-chooser-grid grid grid-cols-2 md:grid-cols-4 gap-4">
        {sortedCards.map((card) => (
          <ChooserCard key={card.leagueId} card={card} />
        ))}
      </div>
    </section>
  );
}
