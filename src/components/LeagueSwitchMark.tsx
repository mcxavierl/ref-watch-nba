"use client";

import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { useColorMode } from "@/lib/a11y/useColorMode";

type LeagueNavId = "nba" | "nhl" | "nfl" | "epl" | "laliga";

type LeagueLogoSet = {
  onDark: string;
  onLight: string;
  alt: string;
  className?: string;
};

const LEAGUE_LOGOS: Record<LeagueNavId, LeagueLogoSet> = {
  nba: {
    onDark: "https://cdn.nba.com/logos/leagues/logo-nba.svg",
    onLight: "https://cdn.nba.com/logos/leagues/logo-nba.svg",
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

function leagueMarkSrc(logos: LeagueLogoSet, colorMode: "light" | "dark"): string {
  return colorMode === "light" ? logos.onLight : logos.onDark;
}

type LeagueNavMarkProps = {
  league: LeagueId;
  active?: boolean;
};

export function LeagueNavMark({ league, active = false }: LeagueNavMarkProps) {
  const colorMode = useColorMode();
  const logos = LEAGUE_LOGOS[league as LeagueNavId];
  if (!logos) {
    return (
      <span className="league-nav-mark-fallback" aria-hidden>
        {LEAGUES[league].shortLabel}
      </span>
    );
  }

  const src = leagueMarkSrc(logos, colorMode);

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`league-nav-mark${logos.className ? ` ${logos.className}` : ""}${active ? " league-nav-mark--on-pill" : ""}`}
      data-league={league}
      width={league === "nfl" ? 13 : 28}
      height={league === "nfl" ? 18 : 18}
      decoding="async"
      referrerPolicy="no-referrer"
    />
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
