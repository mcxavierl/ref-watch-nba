"use client";

import { useState } from "react";
import { useColorMode } from "@/lib/a11y/useColorMode";
import { teamLogoUrl as cbbTeamLogoUrl } from "@/lib/cbb/teams";
import { teamLogoUrl as cfbTeamLogoUrl } from "@/lib/cfb/teams";
import { teamLogoUrl as eplTeamLogoUrl } from "@/lib/epl/teams";
import { teamLogoUrl as laligaTeamLogoUrl } from "@/lib/laliga/teams";
import { teamLogoUrl as nflTeamLogoUrl } from "@/lib/nfl/teams";
import { teamLogoUrl as nhlTeamLogoUrl } from "@/lib/nhl/teams";
import { getTeam as getNbaTeam, teamLogoUrl as nbaTeamLogoUrl } from "@/lib/teams";
import { resolveWnbaTeamAbbr, teamLogoUrl as wnbaTeamLogoUrl } from "@/lib/wnba/teams";
import type { NbaTeam } from "@/lib/teams";
import type { NhlTeam } from "@/lib/nhl/teams";

type TeamLike = Pick<NbaTeam | NhlTeam, "abbr" | "name"> & {
  nbaId?: number;
  logoUrl?: string;
};

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-11 w-11",
  xl: "h-14 w-14",
} as const;

const sizePixels = {
  sm: 24,
  md: 32,
  lg: 44,
  xl: 56,
} as const;

export function TeamLogo({
  team,
  size = "md",
  className = "",
  sport = "nba",
  plateTone = "auto",
}: {
  team: TeamLike;
  sport?: "nba" | "nhl" | "wnba" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  size?: keyof typeof sizeClasses;
  className?: string;
  /** Background the logo sits on — drives WNBA/NHL variant selection. */
  plateTone?: "auto" | "dark" | "light";
}) {
  const [failed, setFailed] = useState(false);
  const colorMode = useColorMode();
  const resolvedPlateTone =
    plateTone === "auto"
      ? colorMode === "light"
        ? "light"
        : "dark"
      : plateTone;
  const themedUiSurface = resolvedPlateTone === "dark" ? "dark" : "light";
  const nbaId = team.nbaId ?? (sport === "nba" ? getNbaTeam(team.abbr)?.nbaId : undefined);
  const wnbaAbbr = sport === "wnba" ? resolveWnbaTeamAbbr(team.abbr) : team.abbr;
  const themedLogoSrc =
    sport === "wnba"
      ? wnbaTeamLogoUrl(wnbaAbbr, themedUiSurface)
      : sport === "nhl"
        ? nhlTeamLogoUrl(team.abbr, themedUiSurface)
        : null;
  const logoSrc =
    team.logoUrl ??
    themedLogoSrc ??
    (sport === "laliga"
      ? laligaTeamLogoUrl(team.abbr)
      : sport === "epl"
      ? eplTeamLogoUrl(team.abbr)
      : sport === "nfl"
        ? nflTeamLogoUrl(team.abbr)
        : sport === "cbb"
          ? cbbTeamLogoUrl(team.abbr)
          : sport === "cfb"
            ? cfbTeamLogoUrl(team.abbr)
          : nbaId
            ? nbaTeamLogoUrl(nbaId)
            : null);

  const plateClass = `team-logo-plate ${sizeClasses[size]} ${className}`.trim();

  if (failed || !logoSrc) {
    return (
      <span
        className={plateClass}
        data-sport={sport}
        data-size={size}
        aria-label={`${team.abbr} logo`}
      >
        <span className="team-logo-plate__fallback">{team.abbr}</span>
      </span>
    );
  }

  return (
    <span className={plateClass} data-sport={sport} data-size={size}>
      {/* eslint-disable-next-line @next/next/no-img-element -- onError fallback to abbr badge */}
      <img
        src={logoSrc}
        alt={`${team.abbr} logo`}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="team-logo-plate__img"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
