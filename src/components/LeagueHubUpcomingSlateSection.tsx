"use client";

import { CalendarDays } from "lucide-react";
import { LiveSlateGrid } from "@/components/LiveSlateGrid";
import type { LeagueUpcomingSlate } from "@/lib/overview-upcoming-slate";
import { formatLeagueSlateCounts } from "@/lib/overview-slate-shared";
import type { LeagueId } from "@/lib/leagues";
import { LEAGUE_UPCOMING_SLATE_LIMIT } from "@/lib/overview-upcoming-slate";
import "@/components/overview-clinical-modern.css";
import "@/components/overview-dashboard.css";

type LeagueHubUpcomingSlateSectionProps = {
  slate: LeagueUpcomingSlate;
  leagueLabel: string;
  leagueId: LeagueId;
};

export function LeagueHubUpcomingSlateSection({
  slate,
  leagueLabel,
  leagueId,
}: LeagueHubUpcomingSlateSectionProps) {
  const group = slate.leagueGroup;
  if (!slate.inSeason || !group || group.games.length === 0) return null;

  const countLabel = formatLeagueSlateCounts(group.liveCount, group.scheduledCount);

  return (
    <section
      className="overview-editorial-section overview-editorial-section--slate section-block section-block--compact"
      aria-labelledby="league-hub-upcoming-heading"
    >
      <div className="overview-section-header overview-section-header--primary">
        <h2
          className="overview-section-title overview-section-title--with-icon"
          id="league-hub-upcoming-heading"
        >
          <CalendarDays aria-hidden className="overview-slate-icon" />
          Upcoming games
        </h2>
        <p className="overview-section-lead">
          {`${leagueLabel} live slate${countLabel ? ` (${countLabel})` : ""}. Scores and crews refresh automatically.`}
        </p>
      </div>

      {slate.leagueNote ? (
        <ul className="overview-slate-notes">
          <li className="overview-slate-note" data-league={slate.leagueNote.leagueId}>
            <span className="overview-slate-league-badge">{slate.leagueNote.leagueShortLabel}</span>
            {slate.leagueNote.note}
          </li>
        </ul>
      ) : null}

      <LiveSlateGrid
        initialGames={group.games}
        leagueId={leagueId}
        limit={LEAGUE_UPCOMING_SLATE_LIMIT}
        matchupLabel={`${leagueLabel} matchup`}
        showHubLink={false}
        variant="card"
      />

      {slate.lastUpdated ? (
        <p className="overview-slate-updated">
          Assignments last checked{" "}
          {new Date(slate.lastUpdated).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      ) : null}
    </section>
  );
}
