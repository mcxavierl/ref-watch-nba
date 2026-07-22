"use client";

import { useState } from "react";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { leagueLogoNavClass, leagueLogoSrc, leagueNavMarkDimensions } from "@/lib/league-logo-src";
import { useColorMode } from "@/lib/a11y/useColorMode";

type LeagueNavId = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

type LeagueLogoSet = {
  onDark: string;
  onLight: string;
  alt: string;
  className?: string;
};

const PRO_LEAGUE_LOGOS: Record<Exclude<LeagueNavId, "cbb" | "cfb">, LeagueLogoSet> = {
  nba: {
    onDark: "/logos/nba-logo.svg",
    onLight: "/logos/nba-logo-light.svg",
    alt: "NBA",
    className: "league-nav-mark--nba",
  },
  nhl: {
    onDark: "https://assets.nhle.com/logos/nhl/svg/NHL_light.svg",
    onLight: "https://assets.nhle.com/logos/nhl/svg/NHL_dark.svg",
    alt: "NHL",
    className: "league-nav-mark--nhl",
  },
  nfl: {
    onDark: "/logos/nfl-shield.svg",
    onLight: "/logos/nfl-shield.svg",
    alt: "NFL",
    className: "league-nav-mark--nfl",
  },
  epl: {
    onDark: "/logos/epl-lion.svg",
    onLight: "/logos/epl-lion-dark.svg",
    alt: "Premier League",
    className: "league-nav-mark--epl",
  },
  laliga: {
    onDark: "/logos/laliga-white.png",
    onLight: "/logos/laliga-red.png",
    alt: "La Liga",
    className: "league-nav-mark--laliga",
  },
};

type LeagueNavMarkProps = {
  league: LeagueId;
  active?: boolean;
};

export function LeagueNavMark({ league, active = false }: LeagueNavMarkProps) {
  const colorMode = useColorMode();
  const [failed, setFailed] = useState(false);
  const src = leagueLogoSrc(league, colorMode);
  const proLogos = PRO_LEAGUE_LOGOS[league as Exclude<LeagueNavId, "cbb" | "cfb">];
  if (!src || failed) {
    return (
      <span className="league-nav-mark-fallback" aria-hidden>
        {LEAGUES[league].shortLabel}
      </span>
    );
  }

  const className = leagueLogoNavClass(league) || proLogos?.className || `league-nav-mark--${league}`;
  const { width, height } = leagueNavMarkDimensions(league);

  return (
    <span className="league-nav-mark-wrap" data-league={league} aria-hidden>
      <img
        src={src}
        alt=""
        className={`league-nav-mark${className ? ` ${className}` : ""}${active ? " league-nav-mark--on-pill" : ""}`}
        data-league={league}
        width={width}
        height={height}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

/** @deprecated Use LeagueNavMark */
export const LeagueSwitchMark = LeagueNavMark;

export type { LeagueNavId };

export function leagueNavLabel(league: LeagueId): string {
  return LEAGUES[league].label;
}

/** @deprecated Use leagueNavLabel */
export const leagueSwitchLabel = leagueNavLabel;
