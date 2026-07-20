"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { TeamLogo } from "@/components/TeamLogo";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  formatSlateDateLabel,
  resolveSlateTeam,
  slateTeamLogoSport,
} from "@/lib/slate-team-display";

function primaryInsightLine(game: OverviewSlateEntry): string | undefined {
  return game.gameContextLine ?? game.lastMeetingLine ?? game.teamContextLine ?? game.matchupInsight;
}

export function UpcomingGameCard({
  game,
  index = 0,
  onOpenPreview,
}: {
  game: OverviewSlateEntry;
  index?: number;
  onOpenPreview?: () => void;
}) {
  const awayTeam = resolveSlateTeam(game.leagueId, game.awayTeam);
  const homeTeam = resolveSlateTeam(game.leagueId, game.homeTeam);
  const dateLabel = formatSlateDateLabel(game.slateDate);
  const insightLine = primaryInsightLine(game);
  const secondaryLine =
    insightLine !== game.matchupInsight ? game.matchupInsight : undefined;

  const handleActivate = () => {
    onOpenPreview?.();
  };

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (!onOpenPreview) return;
    const target = event.target as HTMLElement;
    if (target.closest("a, button")) return;
    handleActivate();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onOpenPreview) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <article
      className={`upcoming-game-card${onOpenPreview ? " upcoming-game-card--interactive" : ""}`}
      data-league={game.leagueId}
      data-status={game.status}
      style={{ "--upcoming-i": index } as CSSProperties}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onOpenPreview ? 0 : undefined}
      role={onOpenPreview ? "button" : undefined}
      aria-label={
        onOpenPreview ? `Open ${awayTeam.abbr} at ${homeTeam.abbr} ref preview` : undefined
      }
    >
      <header className="upcoming-game-card__header">
        <div className="upcoming-game-card__header-start">
          <span className="upcoming-game-card__league-mark" aria-hidden>
            <LeagueNavMark league={game.leagueId} active={false} />
          </span>
          {dateLabel ? (
            <time className="upcoming-game-card__date-pill" dateTime={game.slateDate}>
              {dateLabel}
            </time>
          ) : null}
        </div>
        {onOpenPreview ? (
          <span className="upcoming-game-card__cta">Preview refs</span>
        ) : null}
      </header>

      <div className="upcoming-game-card__body">
        <div
          className="upcoming-game-card__matchup"
          aria-label={`${awayTeam.abbr} at ${homeTeam.abbr}`}
        >
          <div className="upcoming-game-card__team">
            <TeamLogo team={awayTeam} sport={slateTeamLogoSport(game.leagueId)} size="xl" />
            <span className="upcoming-game-card__team-name">{awayTeam.displayName}</span>
          </div>
          <span className="upcoming-game-card__at" aria-hidden>
            @
          </span>
          <div className="upcoming-game-card__team">
            <TeamLogo team={homeTeam} sport={slateTeamLogoSport(game.leagueId)} size="xl" />
            <span className="upcoming-game-card__team-name">{homeTeam.displayName}</span>
          </div>
        </div>
        {(insightLine || game.officialsLine || secondaryLine) && (
          <div className="upcoming-game-card__context-slot">
            {insightLine ? (
              <p className="upcoming-game-card__context">{insightLine}</p>
            ) : null}
            {secondaryLine ? (
              <p className="upcoming-game-card__context upcoming-game-card__context--meta">
                {secondaryLine}
              </p>
            ) : null}
            {game.officialsLine ? (
              <p className="upcoming-game-card__meta">{game.officialsLine}</p>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
