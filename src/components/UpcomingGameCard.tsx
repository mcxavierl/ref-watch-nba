"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { Users } from "lucide-react";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { TeamLogo } from "@/components/TeamLogo";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { hasUpcomingCardAssignedCrew } from "@/lib/upcoming-card-hero-insight";
import {
  buildUpcomingCardSignals,
  type UpcomingCardSignalTone,
} from "@/lib/upcoming-card-signals";
import {
  formatSlateDateTimeLabel,
  resolveSlateTeam,
  slateTeamLogoSport,
} from "@/lib/slate-team-display";
import { SlateScoreboard } from "@/components/SlateScoreboard";

function previewCtaLabel(game: OverviewSlateEntry): string {
  return game.crewCount > 0 ? "Preview refs" : "View matchup";
}

function previewAriaLabel(awayAbbr: string, homeAbbr: string, game: OverviewSlateEntry): string {
  return game.crewCount > 0
    ? `Open ${awayAbbr} at ${homeAbbr} ref preview`
    : `Open ${awayAbbr} at ${homeAbbr} matchup sheet`;
}

function upcomingCardCrewLabel(game: OverviewSlateEntry): string | undefined {
  if (game.crewCount === 0) {
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

function trendToneClass(tone: UpcomingCardSignalTone): string {
  if (tone === "positive") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }
  if (tone === "caution") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }
  return "border-slate-700 bg-slate-800/50 text-slate-300";
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
  const showScore = game.gamePhase === "live" || game.gamePhase === "final";
  const showDateLabel = !showScore && Boolean(dateTimeLabel);
  const signals = buildUpcomingCardSignals(game);
  const crewLabel = upcomingCardCrewLabel(game);
  const showCrewCount = game.crewCount > 1 && Boolean(game.headRef);

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
      className={`upcoming-game-card flex h-auto min-h-[260px] flex-col gap-2.5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4${
        onOpenPreview ? " upcoming-game-card--interactive cursor-pointer" : ""
      }`}
      data-league={game.leagueId}
      data-status={game.status}
      data-crew-assigned={crewAssigned ? "true" : "false"}
      style={{ "--upcoming-i": index } as CSSProperties}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onOpenPreview ? 0 : undefined}
      role={onOpenPreview ? "button" : undefined}
      aria-label={
        onOpenPreview ? previewAriaLabel(awayTeam.abbr, homeTeam.abbr, game) : undefined
      }
    >
      <header className="upcoming-game-card__header shrink-0">
        <span className="upcoming-game-card__league-mark" aria-hidden>
          <LeagueNavMark league={game.leagueId} active={false} />
        </span>
        {showDateLabel ? (
          <time
            className="upcoming-game-card__date-label upcoming-game-card__date-label--corner"
            dateTime={game.slateStartAt ?? game.slateDate}
          >
            {dateTimeLabel}
          </time>
        ) : showScore ? (
          <SlateScoreboard game={game} className="upcoming-game-card__scoreboard" compact />
        ) : (
          <span className="upcoming-game-card__header-spacer" aria-hidden />
        )}
      </header>

      <div
        className="upcoming-game-card__matchup shrink-0"
        aria-label={`${awayTeam.abbr} at ${homeTeam.abbr}`}
      >
        <div className="upcoming-game-card__team">
          <TeamLogo team={awayTeam} sport={slateTeamLogoSport(game.leagueId)} size="lg" />
          <span className="upcoming-game-card__team-abbr">{awayTeam.abbr}</span>
          {showScore ? (
            <span className="upcoming-game-card__team-score">
              {game.awayScore ?? 0}
            </span>
          ) : null}
        </div>
        <span className="upcoming-game-card__at" aria-hidden>
          @
        </span>
        <div className="upcoming-game-card__team">
          <TeamLogo team={homeTeam} sport={slateTeamLogoSport(game.leagueId)} size="lg" />
          <span className="upcoming-game-card__team-abbr">{homeTeam.abbr}</span>
          {showScore ? (
            <span className="upcoming-game-card__team-score">
              {game.homeScore ?? 0}
            </span>
          ) : null}
        </div>
      </div>

      <p
        className={`upcoming-game-card__trend line-clamp-2 shrink-0 min-h-[2.75rem] rounded-lg border px-3 py-2 text-center text-[0.6875rem] font-medium leading-snug ${trendToneClass(signals.tone)}`}
        title={signals.primaryTrend}
      >
        {signals.primaryTrend}
      </p>

      <footer className="upcoming-game-card__footer mt-auto shrink-0">
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
            <span className="upcoming-game-card__crew-pending">Crew pending</span>
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
          <span className="upcoming-game-card__cta upcoming-game-card__cta--footer uppercase tracking-wide">
            {previewCtaLabel(game)}
          </span>
        ) : null}
      </footer>
    </article>
  );
}

/** @deprecated Use UpcomingGameCard. Alias for dashboard card primitive. */
export const GameCard = UpcomingGameCard;
