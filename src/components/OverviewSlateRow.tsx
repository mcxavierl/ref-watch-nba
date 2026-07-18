"use client";

import Link from "next/link";
import { TeamLogo } from "@/components/TeamLogo";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  formatSlateDateLabel,
  resolveSlateTeam,
  slateTeamLogoSport,
} from "@/lib/slate-team-display";

export function OverviewSlateRow({
  game,
  showHubLink = true,
}: {
  game: OverviewSlateEntry;
  showHubLink?: boolean;
}) {
  const awayTeam = resolveSlateTeam(game.leagueId, game.awayTeam);
  const homeTeam = resolveSlateTeam(game.leagueId, game.homeTeam);
  const dateLabel = formatSlateDateLabel(game.slateDate);

  return (
    <li className="overview-slate-row" data-league={game.leagueId} data-status={game.status}>
      <div className="overview-slate-row-inner">
      <div className="overview-slate-row-matchup-block">
        <span
          className="overview-slate-row-matchup"
          aria-label={`${awayTeam.abbr} at ${homeTeam.abbr}`}
        >
          <TeamLogo team={awayTeam} sport={slateTeamLogoSport(game.leagueId)} size="lg" />
          <span className="overview-slate-row-at" aria-hidden>
            @
          </span>
          <TeamLogo team={homeTeam} sport={slateTeamLogoSport(game.leagueId)} size="lg" />
          <span className="overview-slate-row-names">
            {awayTeam.abbr} @ {homeTeam.abbr}
          </span>
        </span>
        {game.seasonStageNote ? (
          <span className="overview-slate-row-season-stage">{game.seasonStageNote}</span>
        ) : null}
        {game.lastMeetingLine ? (
          <span className="overview-slate-row-last-meeting">{game.lastMeetingLine}</span>
        ) : null}
        {game.teamContextLine ? (
          <span className="overview-slate-row-team-context">{game.teamContextLine}</span>
        ) : null}
        {game.officialsLine ? (
          <span className="overview-slate-row-officials">{game.officialsLine}</span>
        ) : null}
      </div>
        {game.status === "scheduled" && dateLabel ? (
          <span className="overview-slate-date">{dateLabel}</span>
        ) : null}
        {showHubLink ? (
          <Link href={game.href} className="overview-slate-row-link">
            Open slate
          </Link>
        ) : null}
      </div>
      {game.matchupInsight ? (
        <p className="overview-slate-insight">{game.matchupInsight}</p>
      ) : null}
      <p className="overview-slate-crew">
        {game.status === "scheduled" ? (
          "Crews TBD"
        ) : game.headRef ? (
          <>
            Head ref <strong>{game.headRef}</strong>
            {game.crewCount > 1 ? ` · ${game.crewCount}-person crew` : null}
          </>
        ) : (
          `${game.crewCount}-person crew`
        )}
      </p>
    </li>
  );
}
