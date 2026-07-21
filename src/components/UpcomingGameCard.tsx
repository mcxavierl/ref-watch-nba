"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { Users } from "lucide-react";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { TeamLogo } from "@/components/TeamLogo";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { EvidenceTeaser } from "@/components/evidence/EvidenceTeaser";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import {
  hasUpcomingCardAssignedCrew,
  upcomingCardInsightFallback,
} from "@/lib/upcoming-card-hero-insight";
import {
  formatSlateDateTimeLabel,
  resolveSlateTeam,
  slateTeamLogoSport,
} from "@/lib/slate-team-display";

function upcomingCardCrewLabel(game: OverviewSlateEntry): string | undefined {
  if (game.crewCount === 0 || game.status === "scheduled") {
    if (game.officialsLine && /TBD|not assigned/i.test(game.officialsLine)) {
      return game.officialsLine;
    }
    return undefined;
  }

  if (game.headRef) {
    return game.headRef;
  }

  return undefined;
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
  const crewAssigned = hasUpcomingCardAssignedCrew(game);
  const projectionEvidence =
    crewAssigned && game.preview ? buildProjectionEvidence(game.preview) : null;
  const crewLabel = upcomingCardCrewLabel(game);
  const showCrewCount = game.crewCount > 1 && Boolean(game.headRef) && game.status !== "scheduled";

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
      data-crew-assigned={crewAssigned ? "true" : "false"}
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
        <span className="upcoming-game-card__league-mark" aria-hidden>
          <LeagueNavMark league={game.leagueId} active={false} />
        </span>
        {dateTimeLabel ? (
          <time
            className="upcoming-game-card__date-label upcoming-game-card__date-label--corner"
            dateTime={game.slateStartAt ?? game.slateDate}
          >
            {dateTimeLabel}
          </time>
        ) : (
          <span className="upcoming-game-card__header-spacer" aria-hidden />
        )}
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

        <div className="upcoming-game-card__context-slot">
          {projectionEvidence ? (
            <EvidenceTeaser evidence={projectionEvidence} compact />
          ) : (
            <p className="upcoming-game-card__hero-fallback">
              {upcomingCardInsightFallback(game)}
            </p>
          )}
        </div>
      </div>

      <footer className="upcoming-game-card__footer">
        <div className="upcoming-game-card__crew-meta">
          {crewLabel ? (
            crewAssigned && game.headRef ? (
              <>
                <span className="upcoming-game-card__crew-role">Head ref</span>
                <strong className="upcoming-game-card__crew-name">{game.headRef}</strong>
              </>
            ) : (
              <span className="upcoming-game-card__crew-pending">{crewLabel}</span>
            )
          ) : (
            <span className="upcoming-game-card__crew-pending">
              {upcomingCardInsightFallback(game).split(" · ")[0]}
            </span>
          )}
          {showCrewCount ? (
            <span
              className="upcoming-game-card__crew-count"
              aria-label={`${game.crewCount}-person crew`}
            >
              <Users size={12} strokeWidth={2.25} aria-hidden />
              <span aria-hidden>{game.crewCount}</span>
            </span>
          ) : null}
        </div>
        {onOpenPreview ? (
          <span className="upcoming-game-card__cta upcoming-game-card__cta--footer">
            Preview refs
          </span>
        ) : null}
      </footer>
    </article>
  );
}
