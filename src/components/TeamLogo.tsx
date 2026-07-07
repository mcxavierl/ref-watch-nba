"use client";

import { useState } from "react";
import { teamLogoUrl } from "@/lib/teams";
import type { NbaTeam } from "@/lib/teams";

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-10 w-10",
} as const;

export function TeamLogo({
  team,
  size = "md",
  className = "",
}: {
  team: Pick<NbaTeam, "abbr" | "nbaId" | "name">;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
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
      src={teamLogoUrl(team.nbaId)}
      alt={`${team.abbr} logo`}
      className={`shrink-0 object-contain ${sizeClasses[size]} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
