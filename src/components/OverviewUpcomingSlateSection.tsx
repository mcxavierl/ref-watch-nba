"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MarqueeOnlyToggle, MARQUEE_ONLY_EMPTY_COPY } from "@/components/MarqueeOnlyToggle";
import { UpcomingGameCard } from "@/components/UpcomingGameCard";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { LEAGUES } from "@/lib/leagues";
import { activeLiveLeagueIds } from "@/lib/league-verification";

type OverviewUpcomingSlateSectionProps = {
  data: CrossLeagueOverview;
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function OverviewUpcomingSlateSection({ data }: OverviewUpcomingSlateSectionProps) {
  const [marqueeOnly, setMarqueeOnly] = useState(false);
  const { upcomingSlate } = data;
  const leagueCardById = new Map(data.leagueCards.map((card) => [card.leagueId, card]));
  const matchupCount = upcomingSlate.totalGames + upcomingSlate.totalScheduled;

  const visibleGames = useMemo(() => {
    if (!marqueeOnly) return upcomingSlate.games;
    return upcomingSlate.games.filter((game) => game.isMarquee);
  }, [marqueeOnly, upcomingSlate.games]);

  return (
    <section
      className="overview-editorial-section overview-editorial-section--slate section-block"
      aria-labelledby="overview-upcoming-heading"
    >
      <div className="overview-section-header overview-section-header--primary overview-upcoming-header">
        <div className="overview-upcoming-toolbar">
          <h2 className="overview-section-title" id="overview-upcoming-heading">
            Upcoming games
          </h2>
          {upcomingSlate.inSeason && upcomingSlate.games.length > 0 ? (
            <MarqueeOnlyToggle active={marqueeOnly} onToggle={() => setMarqueeOnly((v) => !v)} />
          ) : null}
        </div>
        <p className="overview-section-lead overview-upcoming-lead">
          {upcomingSlate.inSeason
            ? matchupCount > 0
              ? `${formatCount(matchupCount)} matchup${matchupCount === 1 ? "" : "s"} on the live slate`
              : "Live slate updates as assignments publish"
            : "Offseason - historical data stays available in each hub."}
        </p>
      </div>

      {upcomingSlate.inSeason ? (
        visibleGames.length > 0 ? (
          <div className="upcoming-games-grid">
            {visibleGames.map((game) => (
              <UpcomingGameCard key={`${game.leagueId}-${game.gameId}`} game={game} />
            ))}
          </div>
        ) : marqueeOnly ? (
          <p className="overview-slate-empty overview-slate-empty-panel">{MARQUEE_ONLY_EMPTY_COPY}</p>
        ) : (
          <p className="overview-slate-empty overview-slate-empty-panel">
            No published matchups yet. Check back closer to tip-off.
          </p>
        )
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
