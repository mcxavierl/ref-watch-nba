import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { TeamLogo } from "@/components/TeamLogo";
import {
  refProfileTeamLogoSport,
  refProfileTeamPath,
  resolveRefProfileTeam,
} from "@/lib/ref-profile-team-utils";
import type { RefTeamPerformanceRow } from "@/lib/ref-team-performance-trends";
import type { LeagueId } from "@/lib/leagues";
import { TEAM_REF_MIN_GAMES } from "@/lib/teamRefLeaderboards";

function rateBadgeClass(rate: number, variant: "best" | "worst"): string {
  const pct = rate * 100;
  if (variant === "best") {
    if (pct >= 55) return "ref-profile-team-rate-badge--high";
    if (pct >= 50) return "ref-profile-team-rate-badge--mid";
    return "ref-profile-team-rate-badge--neutral";
  }
  if (pct <= 45) return "ref-profile-team-rate-badge--low";
  if (pct <= 50) return "ref-profile-team-rate-badge--mid";
  return "ref-profile-team-rate-badge--neutral";
}

function TeamTrendList({
  title,
  rows,
  leagueId,
  variant,
}: {
  title: string;
  rows: RefTeamPerformanceRow[];
  leagueId: LeagueId;
  variant: "best" | "worst";
}) {
  const sport = refProfileTeamLogoSport(leagueId);

  return (
    <section className="ref-profile-team-trend-panel">
      <h3 className="ref-profile-team-trend-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="ref-profile-team-trend-empty">
          Need at least {TEAM_REF_MIN_GAMES} games per team for ranked splits.
        </p>
      ) : (
        <ul className="ref-profile-team-trend-list">
          {rows.map((row) => {
            const team = resolveRefProfileTeam(leagueId, row.abbr);
            return (
              <li key={row.abbr}>
                <Link
                  href={refProfileTeamPath(leagueId, row.abbr)}
                  className="ref-profile-team-trend-row"
                >
                  <span className="ref-profile-team-trend-team gap-2">
                    <TeamLogo
                      team={team}
                      sport={sport}
                      size="sm"
                      className="ref-profile-team-trend-logo shrink-0"
                    />
                    <span className="ref-profile-team-trend-name truncate">{team.name}</span>
                  </span>
                  <span className="ref-profile-team-trend-record tabular-nums text-right">
                    {row.recordLabel}
                  </span>
                  <span
                    className={`ref-profile-team-rate-badge whitespace-nowrap px-3 tabular-nums ${rateBadgeClass(row.rate, variant)}`}
                  >
                    {row.rateLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function RefProfileTeamTrends({
  best,
  worst,
  leagueId,
}: {
  best: RefTeamPerformanceRow[];
  worst: RefTeamPerformanceRow[];
  leagueId: LeagueId;
}) {
  if (best.length === 0 && worst.length === 0) return null;

  return (
    <section className="ref-profile-team-trends" aria-labelledby="ref-team-trends-heading">
      <h2 id="ref-team-trends-heading" className="ref-profile-section-title">
        Team performance trends under this ref
      </h2>
      <div className="ref-profile-team-trend-grid">
        <TeamTrendList
          title="Best performing teams"
          rows={best}
          leagueId={leagueId}
          variant="best"
        />
        <TeamTrendList
          title="Worst performing teams"
          rows={worst}
          leagueId={leagueId}
          variant="worst"
        />
      </div>
    </section>
  );
}
