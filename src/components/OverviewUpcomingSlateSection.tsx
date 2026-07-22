"use client";

import Link from "next/link";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { LiveSlateGrid } from "@/components/LiveSlateGrid";
import { LEAGUES } from "@/lib/leagues";
import { activeLiveLeagueIds } from "@/lib/league-verification";

type OverviewUpcomingSlateSectionProps = {
  data: CrossLeagueOverview;
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function OverviewUpcomingSlateSection({ data }: OverviewUpcomingSlateSectionProps) {
  const { upcomingSlate } = data;
  const leagueCardById = new Map(data.leagueCards.map((card) => [card.leagueId, card]));

  return (
    <section
      className="overview-editorial-section overview-editorial-section--slate section-block"
      aria-labelledby="overview-upcoming-heading"
    >
      <div className="overview-section-header overview-section-header--primary overview-upcoming-header">
        <h2 className="overview-section-title" id="overview-upcoming-heading">
          Live Slate
        </h2>
        <p className="overview-section-lead overview-upcoming-lead">
          {upcomingSlate.inSeason
            ? "Live scores, crews, and assignments refresh automatically."
            : "Offseason - historical data stays available in each hub."}
        </p>
      </div>

      {upcomingSlate.inSeason ? (
        <LiveSlateGrid
          initialSlate={{
            ...upcomingSlate,
            fetchedAt: upcomingSlate.lastUpdated ?? new Date().toISOString(),
          }}
          initialGames={upcomingSlate.games}
          matchupLabel="matchup"
        />
      ) : (
        <div className="overview-slate-offseason">
          <div className="overview-slate-offseason-grid">
            {activeLiveLeagueIds()
              .filter((leagueId) => leagueCardById.has(leagueId))
              .map((leagueId) => {
                const card = leagueCardById.get(leagueId);
                const league = LEAGUES[leagueId];
                if (!card) return null;
                return (
                  <Link
                    key={leagueId}
                    href={card.href}
                    className="overview-slate-offseason-card rw-focus-ring"
                    data-league={leagueId}
                  >
                    <span className="overview-slate-offseason-label">{league.shortLabel}</span>
                    <span className="overview-slate-offseason-meta">
                      {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
                    </span>
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </section>
  );
}
