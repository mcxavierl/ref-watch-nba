import Link from "next/link";
import { Suspense } from "react";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { LEAGUES } from "@/lib/leagues";
import { leagueHeroCopy } from "@/lib/league-hero-copy";
import { nbaSeasonScopeAuditNote } from "@/lib/nba-team-season-records";
import { formatSeasonScope } from "@/lib/season-scope";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

type SlateLeagueId = "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";

type LeagueSlateHeroProps = {
  leagueId: SlateLeagueId;
  assignments: AssignmentsFile;
  refStats: RefStatsFile;
  productHome?: boolean;
  showScopeToggle?: boolean;
  scopeLabel?: string;
};

function formatStatCount(value: number | undefined): string {
  if (value == null || value === 0) return "-";
  return value.toLocaleString();
}

const PRODUCT_HOME_STAT_LINKS = [
  { key: "officials" as const, href: "/refs" },
  { key: "games" as const, href: "/matrix" },
  { key: "seasons" as const, href: "/insights#trends" },
] as const;

export function LeagueSlateHero({
  leagueId,
  assignments,
  refStats,
  productHome = false,
  showScopeToggle = false,
  scopeLabel,
}: LeagueSlateHeroProps) {
  const config = LEAGUES[leagueId];
  const copy = leagueHeroCopy(leagueId);
  const isOffseason = assignments.games.length === 0;
  const officialCount = refStats.refs?.length ?? 0;
  const gamesProcessed = refStats.meta.totalGamesProcessed;
  const seasonSpan = formatSeasonScope(refStats.meta.seasons.length);
  const seasonAuditNote =
    leagueId === "nba" ? nbaSeasonScopeAuditNote(refStats.meta.seasons) : null;
  const useInteractiveStats = productHome && isOffseason;

  const statValues = {
    officials: officialCount > 0 ? officialCount.toLocaleString() : "-",
    games: formatStatCount(gamesProcessed),
    seasons: seasonSpan,
  };

  return (
    <section
      className={`page-hero page-hero-slate league-slate-hero${useInteractiveStats ? " league-slate-hero-product" : ""}`}
      data-league={leagueId}
      aria-labelledby={`${leagueId}-slate-heading`}
    >
      <p className="league-slate-kicker">{copy.kicker}</p>
      <h1 className="page-title" id={`${leagueId}-slate-heading`}>
        {isOffseason ? copy.offseasonTitle : copy.liveTitle}
      </h1>
      <p className="page-lead">
        {isOffseason ? copy.offseasonLead : copy.liveLead}
      </p>

      <dl
        className={`league-slate-stats${useInteractiveStats ? " league-slate-stats-interactive" : ""}`}
        aria-label={`${config.dataLeague} dataset scope`}
      >
        {useInteractiveStats
          ? PRODUCT_HOME_STAT_LINKS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="league-slate-stat league-slate-stat-link"
              >
                <span className="league-slate-stat-label">
                  {copy.statLabels[item.key]}
                </span>
                <span className="league-slate-stat-value data-signal">
                  {statValues[item.key]}
                </span>
              </Link>
            ))
          : (
            <>
              <div className="league-slate-stat">
                <dt>{copy.statLabels.officials}</dt>
                <dd className="data-signal">{statValues.officials}</dd>
              </div>
              <div className="league-slate-stat">
                <dt>{copy.statLabels.games}</dt>
                <dd className="data-signal">{statValues.games}</dd>
              </div>
              <div className="league-slate-stat">
                <dt>{copy.statLabels.seasons}</dt>
                <dd className="data-signal">{statValues.seasons}</dd>
              </div>
            </>
          )}
      </dl>

      {showScopeToggle && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {scopeLabel ? (
            <p className="text-sm text-zinc-600">{scopeLabel}</p>
          ) : (
            <span />
          )}
          <Suspense fallback={null}>
            <SeasonScopeToggle />
          </Suspense>
        </div>
      )}

      <DataFreshnessMeta
        assignments={assignments}
        refStats={refStats}
        league={
          config.dataLeague === "NBA" ||
          config.dataLeague === "NHL" ||
          config.dataLeague === "NFL" ||
          config.dataLeague === "CBB" ||
          config.dataLeague === "CFB"
            ? config.dataLeague
            : undefined
        }
      />
      {seasonAuditNote && (
        <p className="league-slate-season-audit">{seasonAuditNote}</p>
      )}
    </section>
  );
}

export type { SlateLeagueId };
