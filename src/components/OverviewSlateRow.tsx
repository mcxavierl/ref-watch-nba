"use client";

import Link from "next/link";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { TeamLogo } from "@/components/TeamLogo";
import type { LeagueId } from "@/lib/leagues";
import type { OverviewSlateEntry } from "@/lib/overview-upcoming-slate";
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

export function OverviewSlateRow({ game }: { game: OverviewSlateEntry }) {
  const awayTeam = resolveTeam(game.leagueId, game.awayTeam);
  const homeTeam = resolveTeam(game.leagueId, game.homeTeam);
  const dateLabel = game.slateDate
    ? new Date(`${game.slateDate}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <li className="overview-slate-row" data-league={game.leagueId} data-status={game.status}>
      <div className="overview-slate-row-main">
        <span className="overview-slate-league-mark" aria-hidden>
          <LeagueNavMark league={game.leagueId} active={false} />
        </span>
        <span
          className="overview-slate-matchup-logos"
          aria-label={`${awayTeam.abbr} at ${homeTeam.abbr}`}
        >
          <TeamLogo team={awayTeam} sport={teamLogoSport(game.leagueId)} size="sm" />
          <span className="overview-slate-matchup-at" aria-hidden>
            @
          </span>
          <TeamLogo team={homeTeam} sport={teamLogoSport(game.leagueId)} size="sm" />
        </span>
        {game.status === "scheduled" && dateLabel ? (
          <span className="overview-slate-date">{dateLabel}</span>
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
      <Link href={game.href} className="overview-slate-row-link">
        Open {game.leagueShortLabel} hub
      </Link>
    </li>
  );
}
