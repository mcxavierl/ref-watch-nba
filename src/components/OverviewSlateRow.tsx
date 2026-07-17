"use client";

import Link from "next/link";
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

export function OverviewSlateRow({
  game,
  showHubLink = true,
}: {
  game: OverviewSlateEntry;
  showHubLink?: boolean;
}) {
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
      <div className="overview-slate-row-inner">
        <span
          className="overview-slate-row-matchup"
          aria-label={`${awayTeam.abbr} at ${homeTeam.abbr}`}
        >
          <TeamLogo team={awayTeam} sport={teamLogoSport(game.leagueId)} size="sm" />
          <span className="overview-slate-row-at" aria-hidden>
            @
          </span>
          <TeamLogo team={homeTeam} sport={teamLogoSport(game.leagueId)} size="sm" />
          <span className="overview-slate-row-names">
            {awayTeam.abbr} @ {homeTeam.abbr}
          </span>
        </span>
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
