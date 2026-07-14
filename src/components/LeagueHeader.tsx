import type { ReactNode } from "react";
import type { LeagueId } from "@/lib/leagues";
import { formatLeagueSeasonStart } from "@/config/leagueConfig";

type LeagueSeasonStartBadgeProps = {
  leagueId: LeagueId;
  className?: string;
};

/** Subtle MM/DD season-start label — replaces legacy "Live" status chips. */
export function LeagueSeasonStartBadge({
  leagueId,
  className = "",
}: LeagueSeasonStartBadgeProps) {
  const seasonStart = formatLeagueSeasonStart(leagueId);
  if (!seasonStart) return null;

  return (
    <span
      className={`league-season-start-badge ${className}`.trim()}
      title="Season start"
      aria-label={`Season starts ${seasonStart}`}
    >
      {seasonStart}
    </span>
  );
}

type LeagueHeaderProps = {
  leagueId: LeagueId;
  label: string;
  meta?: ReactNode;
  className?: string;
};

/**
 * Compact league title row with season-start metadata for dashboard cards and hubs.
 */
export function LeagueHeader({
  leagueId,
  label,
  meta,
  className = "",
}: LeagueHeaderProps) {
  return (
    <div className={`league-header ${className}`.trim()}>
      <span className="league-header-label">{label}</span>
      <div className="league-header-meta">
        <LeagueSeasonStartBadge leagueId={leagueId} />
        {meta}
      </div>
    </div>
  );
}
