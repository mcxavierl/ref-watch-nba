"use client";

import { useState } from "react";
import { useColorMode } from "@/lib/a11y/useColorMode";
import { teamLogoUrl as nbaTeamLogoUrl } from "@/lib/teams";
import { teamLogoUrl as nhlTeamLogoUrl } from "@/lib/nhl/teams";
import { teamLogoUrl as nflTeamLogoUrl } from "@/lib/nfl/teams";
import { teamLogoUrl as laligaTeamLogoUrl } from "@/lib/laliga/teams";
import { teamLogoUrl as eplTeamLogoUrl } from "@/lib/epl/teams";
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
}: {
  team: TeamLike;
  sport?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const colorMode = useColorMode();
  const nhlUiSurface = colorMode === "light" ? "light" : "dark";
  const logoSrc =
    team.logoUrl ??
    (sport === "laliga"
      ? laligaTeamLogoUrl(team.abbr)
      : sport === "epl"
      ? eplTeamLogoUrl(team.abbr)
      : sport === "nfl"
        ? nflTeamLogoUrl(team.abbr)
        : sport === "nhl"
          ? nhlTeamLogoUrl(team.abbr, nhlUiSurface)
          : team.nbaId
            ? nbaTeamLogoUrl(team.nbaId)
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
        onError={() => setFailed(true)}
      />
    </span>
  );
}
