"use client";

import Link from "next/link";
import type { KeyboardEvent, MouseEvent } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { SlateOfficialsLine } from "@/components/SlateOfficialsLine";
import {
  formatSlateDateTimeLabel,
  resolveSlateTeam,
  slateTeamLogoSport,
} from "@/lib/slate-team-display";
import { SlateScoreboard } from "@/components/SlateScoreboard";

function previewCtaLabel(game: OverviewSlateEntry): string {
  return game.crewCount > 0 ? "Preview refs" : "View matchup";
}

function slateRowContextLines(game: OverviewSlateEntry): {
  primary?: string;
  secondary?: string;
  teamContext?: string;
} {
  if (game.previewCardInsights && game.previewCardInsights.length > 0) {
    return {
      primary: game.previewCardInsights[0],
      secondary: game.previewCardInsights[1],
    };
  }

  if (game.preview?.awaitingCrew && game.preview.matchupBriefing) {
    const briefing = game.preview.matchupBriefing;
    return {
      primary: briefing.lines[0] ?? game.matchupInsight,
      secondary: briefing.lastMeeting ?? briefing.lines[1],
    };
  }

  if (game.preview && game.crewCount > 0) {
    if (game.matchupInsight) {
      return { primary: game.matchupInsight };
    }
    return {};
  }

  return {
    primary: game.gameContextLine ?? game.lastMeetingLine,
    teamContext: !game.gameContextLine ? game.teamContextLine : undefined,
  };
}

export function OverviewSlateRow({
  game,
  showHubLink = true,
  onOpenPreview,
}: {
  game: OverviewSlateEntry;
  showHubLink?: boolean;
  onOpenPreview?: () => void;
}) {
  const awayTeam = resolveSlateTeam(game.leagueId, game.awayTeam);
  const homeTeam = resolveSlateTeam(game.leagueId, game.homeTeam);
  const dateTimeLabel = formatSlateDateTimeLabel(game.slateDate, game.slateStartAt);
  const showScore = game.gamePhase === "live" || game.gamePhase === "final";
  const { primary: contextLine, secondary: secondaryContext, teamContext } =
    slateRowContextLines(game);

  const handleActivate = () => {
    onOpenPreview?.();
  };

  const handleClick = (event: MouseEvent<HTMLLIElement>) => {
    if (!onOpenPreview) return;
    const target = event.target as HTMLElement;
    if (target.closest("a, button")) return;
    handleActivate();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (!onOpenPreview) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <li
      className={`overview-slate-row${onOpenPreview ? " overview-slate-row--interactive" : ""}`}
      data-league={game.leagueId}
      data-status={game.status}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onOpenPreview ? 0 : undefined}
      role={onOpenPreview ? "button" : undefined}
      aria-label={
        onOpenPreview
          ? game.crewCount > 0
            ? `Open ${awayTeam.abbr} at ${homeTeam.abbr} ref preview`
            : `Open ${awayTeam.abbr} at ${homeTeam.abbr} matchup sheet`
          : undefined
      }
    >
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
        {showScore ? <SlateScoreboard game={game} className="overview-slate-row-scoreboard" /> : null}
        {game.seasonStageNote ? (
          <span className="overview-slate-row-season-stage">{game.seasonStageNote}</span>
        ) : null}
        {contextLine ? (
          <span className="overview-slate-row-game-context">{contextLine}</span>
        ) : null}
        {secondaryContext ? (
          <span className="overview-slate-row-team-context">{secondaryContext}</span>
        ) : null}
        {!contextLine && teamContext ? (
          <span className="overview-slate-row-team-context">{teamContext}</span>
        ) : null}
        {game.officialsLine ? (
          <SlateOfficialsLine
            line={game.officialsLine}
            headRef={game.headRef}
            className="overview-slate-row-officials"
          />
        ) : null}
      </div>
        {game.status === "scheduled" && !showScore && dateTimeLabel ? (
          <span className="overview-slate-date">{dateTimeLabel}</span>
        ) : null}
        {showHubLink ? (
          onOpenPreview ? (
            <span className="overview-slate-row-link">{previewCtaLabel(game)}</span>
          ) : (
            <Link href={game.href} className="overview-slate-row-link">
              Open slate
            </Link>
          )
        ) : null}
      </div>
      {game.preview && game.crewCount > 0 ? null : game.matchupInsight ? (
        <p className="overview-slate-insight">{game.matchupInsight}</p>
      ) : null}
      <p className="overview-slate-crew">
        {game.crewCount === 0 ? (
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
