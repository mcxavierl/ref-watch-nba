"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { TeamLogo } from "@/components/TeamLogo";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { SlateOfficialsLine } from "@/components/SlateOfficialsLine";
import {
  formatSlateDateTimeLabel,
  resolveSlateTeam,
  slateTeamLogoSport,
} from "@/lib/slate-team-display";

function upcomingCardInsightLines(game: OverviewSlateEntry): {
  primary?: string;
  secondary?: string;
} {
  if (game.previewCardInsights && game.previewCardInsights.length > 0) {
    return {
      primary: game.previewCardInsights[0],
      secondary: game.previewCardInsights[1],
    };
  }

  if (game.preview && game.crewCount > 0) {
    if (game.matchupInsight) {
      return { primary: game.matchupInsight };
    }
    return {};
  }

  const primary =
    game.gameContextLine ??
    game.lastMeetingLine ??
    game.teamContextLine ??
    game.matchupInsight ??
    game.seasonStageNote;
  const secondary =
    primary && primary !== game.matchupInsight ? game.matchupInsight : undefined;
  return { primary, secondary };
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
  const dateTimeLabel = formatSlateDateTimeLabel(game.slateDate, game.slateStartAt);
  const { primary: insightLine, secondary: secondaryInsight } = upcomingCardInsightLines(game);
  const showFooter = Boolean(insightLine || secondaryInsight || game.officialsLine || onOpenPreview);

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
          {dateTimeLabel ? (
            <time
              className="upcoming-game-card__date-label"
              dateTime={game.slateStartAt ?? game.slateDate}
            >
              {dateTimeLabel}
            </time>
          ) : null}
        </div>
      </header>

      <div className="upcoming-game-card__body">
        <div
          className="upcoming-game-card__matchup"
          aria-label={`${awayTeam.abbr} at ${homeTeam.abbr}`}
        >
          <div className="upcoming-game-card__team">
            <TeamLogo team={awayTeam} sport={slateTeamLogoSport(game.leagueId)} size="xl" />
            <span className="upcoming-game-card__team-abbr">{awayTeam.abbr}</span>
          </div>
          <span className="upcoming-game-card__at" aria-hidden>
            @
          </span>
          <div className="upcoming-game-card__team">
            <TeamLogo team={homeTeam} sport={slateTeamLogoSport(game.leagueId)} size="xl" />
            <span className="upcoming-game-card__team-abbr">{homeTeam.abbr}</span>
          </div>
        </div>

        {showFooter ? (
          <div className="upcoming-game-card__footer">
            {insightLine ? (
              <p className="upcoming-game-card__insight-line">{insightLine}</p>
            ) : null}
            {secondaryInsight ? (
              <p className="upcoming-game-card__insight-line upcoming-game-card__insight-line--meta">
                {secondaryInsight}
              </p>
            ) : null}
            <div className="upcoming-game-card__footer-bar">
              {game.officialsLine ? (
                <SlateOfficialsLine
                  line={game.officialsLine}
                  headRef={game.headRef}
                  className="upcoming-game-card__meta"
                />
              ) : (
                <span className="upcoming-game-card__meta-spacer" aria-hidden />
              )}
              {onOpenPreview ? (
                <span className="upcoming-game-card__cta upcoming-game-card__cta--footer">
                  Preview refs
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
