"use client";

import Link from "next/link";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { TeamLogo } from "@/components/TeamLogo";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  formatSlateDateLabel,
  resolveSlateTeam,
  slateTeamLogoSport,
} from "@/lib/slate-team-display";

export function UpcomingGameCard({ game }: { game: OverviewSlateEntry }) {
  const awayTeam = resolveSlateTeam(game.leagueId, game.awayTeam);
  const homeTeam = resolveSlateTeam(game.leagueId, game.homeTeam);
  const dateLabel = formatSlateDateLabel(game.slateDate);

  return (
    <article
      className="upcoming-game-card"
      data-league={game.leagueId}
      data-status={game.status}
    >
      <header className="upcoming-game-card__header">
        <span className="upcoming-game-card__league-mark" aria-hidden>
          <LeagueNavMark league={game.leagueId} active={false} />
        </span>
        <div className="upcoming-game-card__header-actions">
          <Link href={game.href} className="upcoming-game-card__cta rw-focus-ring">
            Open slate
          </Link>
          {dateLabel ? (
            <time className="upcoming-game-card__date" dateTime={game.slateDate}>
              {dateLabel}
            </time>
          ) : null}
        </div>
      </header>

      <div className="upcoming-game-card__body">
        <div
          className="upcoming-game-card__matchup"
          aria-label={`${awayTeam.abbr} at ${homeTeam.abbr}`}
        >
          <TeamLogo team={awayTeam} sport={slateTeamLogoSport(game.leagueId)} size="xl" />
          <span className="upcoming-game-card__at" aria-hidden>
            @
          </span>
          <TeamLogo team={homeTeam} sport={slateTeamLogoSport(game.leagueId)} size="xl" />
          <span className="upcoming-game-card__matchup-label">
            {awayTeam.abbr} @ {homeTeam.abbr}
          </span>
        </div>
      </div>

      {game.metadataLine ? (
        <p className="upcoming-game-card__metadata">{game.metadataLine}</p>
      ) : null}
    </article>
  );
}
