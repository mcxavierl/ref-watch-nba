"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { NflSlateGamesList } from "@/components/NflSlateGamesList";
import { OverviewSlateRow } from "@/components/OverviewSlateRow";
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
  const { upcomingSlate } = data;
  const leagueCardById = new Map(data.leagueCards.map((card) => [card.leagueId, card]));
  const matchupCount = upcomingSlate.totalGames + upcomingSlate.totalScheduled;
  const nonNflGames = upcomingSlate.games.filter((game) => game.leagueId !== "nfl");
  const nflGames = upcomingSlate.games.filter((game) => game.leagueId === "nfl");

  return (
    <section
      className="overview-editorial-section overview-editorial-section--slate section-block"
      aria-labelledby="overview-upcoming-heading"
    >
      <div className="overview-section-header overview-section-header--primary">
        <h2 className="overview-section-title overview-section-title--with-icon" id="overview-upcoming-heading">
          <CalendarDays aria-hidden className="overview-slate-icon" />
          Upcoming games
        </h2>
        <p className="overview-section-lead">
          {upcomingSlate.inSeason
            ? matchupCount > 0
              ? `${formatCount(matchupCount)} matchup${matchupCount === 1 ? "" : "s"} on the live slate.`
              : "Live slate updates as assignments publish."
            : "Offseason - historical data stays available in each hub."}
        </p>
      </div>

      {upcomingSlate.inSeason ? (
        <>
          {upcomingSlate.leagueNotes.length > 0 ? (
            <ul className="overview-slate-notes">
              {upcomingSlate.leagueNotes.map((entry) => (
                <li key={entry.leagueId} className="overview-slate-note" data-league={entry.leagueId}>
                  <span className="overview-slate-league-badge">{entry.leagueShortLabel}</span>
                  {entry.note}
                </li>
              ))}
            </ul>
          ) : null}
          {upcomingSlate.games.length > 0 ? (
            <ul className="overview-slate-list">
              {nonNflGames.map((game) => (
                <OverviewSlateRow key={`${game.leagueId}-${game.gameId}`} game={game} />
              ))}
              <NflSlateGamesList games={nflGames} />
            </ul>
          ) : (
            <p className="overview-slate-empty">No published matchups yet. Check back closer to tip-off.</p>
          )}
          {upcomingSlate.lastUpdated ? (
            <p className="overview-slate-updated">
              Assignments last checked{" "}
              {new Date(upcomingSlate.lastUpdated).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          ) : null}
        </>
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
