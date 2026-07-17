import { CalendarDays } from "lucide-react";
import { UpcomingGameCard } from "@/components/UpcomingGameCard";
import type { LeagueUpcomingSlate } from "@/lib/overview-upcoming-slate";
import { formatLeagueSlateCounts } from "@/lib/overview-slate-shared";
import "@/components/overview-clinical-modern.css";
import "@/components/overview-dashboard.css";

type LeagueHubUpcomingSlateSectionProps = {
  slate: LeagueUpcomingSlate;
  leagueLabel: string;
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function LeagueHubUpcomingSlateSection({
  slate,
  leagueLabel,
}: LeagueHubUpcomingSlateSectionProps) {
  const group = slate.leagueGroup;
  if (!slate.inSeason || !group || group.games.length === 0) return null;

  const matchupCount = group.liveCount + group.scheduledCount;
  const countLabel = formatLeagueSlateCounts(group.liveCount, group.scheduledCount);

  return (
    <section
      className="overview-editorial-section overview-editorial-section--slate section-block"
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
          {matchupCount > 0
            ? `${formatCount(matchupCount)} ${leagueLabel} matchup${matchupCount === 1 ? "" : "s"} on the live slate${countLabel ? ` (${countLabel})` : ""}.`
            : "Live slate updates as assignments publish."}
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

      <div className="upcoming-games-grid">
        {group.games.map((game) => (
          <UpcomingGameCard key={`${game.leagueId}-${game.gameId}`} game={game} />
        ))}
      </div>

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
