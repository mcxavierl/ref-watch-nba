"use client";

import { useColorMode } from "@/lib/a11y/useColorMode";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { leagueLogoNavClass, leagueLogoSrc } from "@/lib/league-logo-src";

type LeagueHeroLogoProps = {
  leagueId: LeagueId;
  className?: string;
};

/**
 * League brand mark for hub/slate/insights heroes (larger than nav toggle marks).
 */
export function LeagueHeroLogo({ leagueId, className = "" }: LeagueHeroLogoProps) {
  const colorMode = useColorMode();
  const src = leagueLogoSrc(leagueId, colorMode);

  if (!src) {
    return (
      <span
        className={`league-hero-logo-fallback ${className}`.trim()}
        aria-hidden
      >
        {LEAGUES[leagueId].shortLabel}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`league-hero-logo ${leagueLogoNavClass(leagueId)} ${className}`.trim()}
      data-league={leagueId}
      width={leagueId === "nfl" || leagueId === "cfb" ? 36 : 52}
      height={leagueId === "nfl" || leagueId === "cfb" ? 48 : 40}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
