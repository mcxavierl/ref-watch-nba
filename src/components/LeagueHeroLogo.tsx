"use client";

import Image from "next/image";
import { LogoContainer } from "@/components/LogoContainer";
import { useColorMode } from "@/lib/a11y/useColorMode";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { leagueLogoNavClass, leagueLogoSrc } from "@/lib/league-logo-src";

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
      <LogoContainer size="lg" className={className}>
        <span className="league-hero-logo-fallback" aria-hidden>
          {LEAGUES[leagueId].shortLabel}
        </span>
      </LogoContainer>
    );
  }

  return (
    <LogoContainer size="lg" className={className}>
      <Image
        src={src}
        alt={`${label} logo`}
        width={28}
        height={28}
        className={`league-hero-logo logo-container__mark ${leagueLogoNavClass(leagueId)}`.trim()}
        data-league={leagueId}
        priority={priority}
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </LogoContainer>
  );
}
