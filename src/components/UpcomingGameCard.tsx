"use client";

import Link from "next/link";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { TeamLogo } from "@/components/TeamLogo";
import type { LeagueId } from "@/lib/leagues";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import { getTeam as getCfbTeam } from "@/lib/cfb/teams";
import { getTeam as getEplTeam } from "@/lib/epl/teams";
import { getTeam as getLaligaTeam } from "@/lib/laliga/teams";
import { getTeam as getNflTeam } from "@/lib/nfl/teams";
import { getTeam as getNhlTeam } from "@/lib/nhl/teams";
import { getTeam as getNbaTeam } from "@/lib/teams";

type TeamLike = { abbr: string; name: string; nbaId?: number; logoUrl?: string };

type TeamLogoSport = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

function teamLogoSport(leagueId: LeagueId): TeamLogoSport {
  if (leagueId === "wnba" || leagueId === "mlb") return "nba";
  return leagueId;
}

function resolveTeam(leagueId: LeagueId, abbr: string): TeamLike {
  const key = abbr.toUpperCase();
  const team =
    leagueId === "nba"
      ? getNbaTeam(key)
      : leagueId === "nhl"
        ? getNhlTeam(key)
        : leagueId === "nfl"
          ? getNflTeam(key)
          : leagueId === "epl"
            ? getEplTeam(key)
            : leagueId === "laliga"
              ? getLaligaTeam(key)
              : leagueId === "cbb"
                ? getCbbTeam(key)
                : getCfbTeam(key);

  return team ?? { abbr: key, name: key };
}

export function UpcomingGameCard({ game }: { game: OverviewSlateEntry }) {
  const awayTeam = resolveTeam(game.leagueId, game.awayTeam);
  const homeTeam = resolveTeam(game.leagueId, game.homeTeam);
  const dateLabel = game.slateDate
    ? new Date(`${game.slateDate}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

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
          <TeamLogo team={awayTeam} sport={teamLogoSport(game.leagueId)} size="xl" />
          <span className="upcoming-game-card__at" aria-hidden>
            @
          </span>
          <TeamLogo team={homeTeam} sport={teamLogoSport(game.leagueId)} size="xl" />
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
