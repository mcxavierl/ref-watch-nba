"use client";

import { LogoContainer, type LogoContainerSize } from "@/components/LogoContainer";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { leagueLogoNavClass, leagueLogoSrc } from "@/lib/league-logo-src";
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

type LeagueNavMarkProps = {
  league: LeagueId;
  active?: boolean;
  /** Wrap mark in the shared 32px logo plate (default on). */
  contained?: boolean;
  containerSize?: LogoContainerSize;
  containerClassName?: string;
};

export function LeagueNavMark({
  league,
  active = false,
  contained = true,
  containerSize = "sm",
  containerClassName = "",
}: LeagueNavMarkProps) {
  const colorMode = useColorMode();
  const src = leagueLogoSrc(league, colorMode);
  const proLogos = PRO_LEAGUE_LOGOS[league as Exclude<LeagueNavId, "cbb" | "cfb">];
  if (!src) {
    const fallback = (
      <span className="league-nav-mark-fallback" aria-hidden>
        {LEAGUES[league].shortLabel}
      </span>
    );
    return contained ? (
      <LogoContainer size={containerSize} className={containerClassName}>
        {fallback}
      </LogoContainer>
    ) : (
      fallback
    );
  }

  const className = leagueLogoNavClass(league) || proLogos?.className || `league-nav-mark--${league}`;

  const mark = (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`league-nav-mark logo-container__mark${className ? ` ${className}` : ""}${active ? " league-nav-mark--on-pill" : ""}`}
      data-league={league}
      width={20}
      height={20}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );

  if (!contained) return mark;

  return (
    <LogoContainer size={containerSize} className={containerClassName}>
      {mark}
    </LogoContainer>
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
