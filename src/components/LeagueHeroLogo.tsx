"use client";

import Image from "next/image";
import { useColorMode } from "@/lib/a11y/useColorMode";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { leagueLogoNavClass, leagueLogoSrc, leagueHeroLogoDimensions } from "@/lib/league-logo-src";

type LeagueHeroLogoProps = {
  leagueId: LeagueId;
  className?: string;
  /** Prioritize hero logo for LCP on league hub pages. */
  priority?: boolean;
};

/**
 * League brand mark for hub/slate/insights heroes (larger than nav toggle marks).
 */
export function LeagueHeroLogo({
  leagueId,
  className = "",
  priority = false,
}: LeagueHeroLogoProps) {
  const colorMode = useColorMode();
  const src = leagueLogoSrc(leagueId, colorMode);
  const label = LEAGUES[leagueId].label;

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

  const { width, height } = leagueHeroLogoDimensions(leagueId);

  return (
    <Image
      src={src}
      alt={`${label} logo`}
      width={width}
      height={height}
      className={`league-hero-logo ${leagueLogoNavClass(leagueId)} ${className}`.trim()}
      data-league={leagueId}
      priority={priority}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
