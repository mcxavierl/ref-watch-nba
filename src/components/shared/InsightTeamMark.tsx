"use client";

import { TeamLogo } from "@/components/TeamLogo";
import type { LeagueId } from "@/lib/leagues";
import { resolveSlateTeam, slateTeamLogoSport } from "@/lib/slate-team-display";

/** Team logo anchor for ref×team insight cards (homepage editorial grid). */
export function InsightTeamMark({
  leagueId,
  teamAbbr,
  teamLabel,
  size = "md",
  className = "",
}: {
  leagueId: LeagueId;
  teamAbbr: string;
  teamLabel?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const team = resolveSlateTeam(leagueId, teamAbbr);
  const label = teamLabel?.trim() || team.name;

  return (
    <span
      className={`insight-team-mark ${className}`.trim()}
      title={label}
      aria-label={label}
    >
      <TeamLogo
        team={team}
        sport={slateTeamLogoSport(leagueId)}
        size={size}
        className="insight-team-mark__logo"
      />
    </span>
  );
}
