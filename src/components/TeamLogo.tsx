"use client";

import { useState } from "react";
import { teamLogoUrl as nbaTeamLogoUrl } from "@/lib/teams";
import { teamLogoUrl as nhlTeamLogoUrl } from "@/lib/nhl/teams";
import type { NbaTeam } from "@/lib/teams";
import type { NhlTeam } from "@/lib/nhl/teams";

type TeamLike = Pick<NbaTeam | NhlTeam, "abbr" | "name"> & {
  nbaId?: number;
  logoUrl?: string;
};

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-10 w-10",
} as const;

export function TeamLogo({
  team,
  size = "md",
  className = "",
  sport = "nba",
}: {
  team: TeamLike;
  sport?: "nba" | "nhl";
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const logoSrc =
    team.logoUrl ??
    (sport === "nhl"
      ? nhlTeamLogoUrl(team.abbr)
      : team.nbaId
        ? nbaTeamLogoUrl(team.nbaId)
        : null);

  if (failed || !logoSrc) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-100 font-mono text-[10px] font-semibold text-zinc-600 ${sizeClasses[size]} ${className}`}
        aria-label={`${team.abbr} logo`}
      >
        {team.abbr}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- onError fallback to abbr badge
    <img
      src={logoSrc}
      alt={`${team.abbr} logo`}
      className={`shrink-0 object-contain ${sizeClasses[size]} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
