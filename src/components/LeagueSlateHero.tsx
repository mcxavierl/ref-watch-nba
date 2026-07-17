import Link from "next/link";
import { Suspense } from "react";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { SeasonScopeToggleSkeleton } from "@/components/LayoutShiftSkeletons";
import { LEAGUE_HERO_STATS } from "@/lib/league-hero-stats.generated";
import { LEAGUES } from "@/lib/leagues";
import { leagueHeroCopy } from "@/lib/league-hero-copy";
import { nbaSeasonScopeAuditNote } from "@/lib/nba-team-season-records";
import { isOffseasonSlate, isPendingCrewSlate } from "@/lib/offseason";
import { hubDisplaySeasonScope } from "@/lib/season-scope";
import {
  slateHeroActions,
  slateHeroStatHref,
  type SlateHeroStatKey,
} from "@/lib/slate-hero-links";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

type SlateLeagueId = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

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

function seasonCountFromSnapshot(seasonSpan: string | undefined): number {
  if (!seasonSpan) return 0;
  if (seasonSpan.toLowerCase().includes("this season")) return 1;
  const match = seasonSpan.match(/(\d+)/);
  return match ? Number.parseInt(match[1]!, 10) : 0;
}

const SLATE_HERO_STAT_KEYS: SlateHeroStatKey[] = ["officials", "games", "seasons"];

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
  const isOffseason = isOffseasonSlate(assignments);
  const isPending = isPendingCrewSlate(assignments);
  const snapshot = LEAGUE_HERO_STATS[leagueId];
  const officialCount =
    refStats.refs?.length || snapshot?.officials || 0;
  const gamesProcessed =
    refStats.meta.totalGamesProcessed || snapshot?.games || 0;
  const hubSeasonScope =
    refStats.meta.seasons.length > 0
      ? hubDisplaySeasonScope(leagueId, refStats.meta.seasons)
      : null;
  const seasonSpan = hubSeasonScope?.seasonSpan ?? snapshot?.seasonSpan ?? "-";
  const seasonAuditNote =
    leagueId === "nba" ? nbaSeasonScopeAuditNote(refStats.meta.seasons) : null;
  const seasonCount =
    hubSeasonScope?.seasonCount ??
    seasonCountFromSnapshot(snapshot?.seasonSpan);
  const useInteractiveStats = isOffseason;
  const heroActions = slateHeroActions(leagueId);

  const statValues = {
    officials: officialCount > 0 ? officialCount.toLocaleString() : "-",
    games: formatStatCount(gamesProcessed),
    seasons: seasonSpan,
  };

  return (
    <LeagueHubHero
      leagueId={leagueId}
      className={`page-hero-slate league-slate-hero${useInteractiveStats ? " league-slate-hero-product" : ""}`}
      aria-labelledby={`${leagueId}-slate-heading`}
    >
      <p className="league-slate-kicker">{copy.kicker}</p>
      <h1 className="page-title" id={`${leagueId}-slate-heading`}>
        {isOffseason ? copy.offseasonTitle : isPending ? copy.pendingTitle ?? copy.liveTitle : copy.liveTitle}
      </h1>
      <p className="page-lead">
        {isOffseason ? copy.offseasonLead : isPending ? copy.pendingLead ?? copy.liveLead : copy.liveLead}
      </p>

      <div
        className={`league-slate-stats${useInteractiveStats ? " league-slate-stats-interactive" : ""}`}
        aria-label={`${config.dataLeague} dataset scope`}
        role={useInteractiveStats ? "group" : undefined}
      >
        {useInteractiveStats
          ? SLATE_HERO_STAT_KEYS.map((key) => (
              <Link
                key={key}
                href={slateHeroStatHref(leagueId, key, seasonCount)}
                className="league-slate-stat league-slate-stat-link"
              >
                <span className="league-slate-stat-label">
                  {copy.statLabels[key]}
                </span>
                <span className="league-slate-stat-value data-signal">
                  {statValues[key]}
                </span>
              </Link>
            ))
          : (
            <dl className="contents">
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
            </dl>
          )}
      </div>

      {useInteractiveStats && (
        <nav
          className="league-slate-hero-actions"
          aria-label="Explore historical analytics"
        >
          {heroActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="league-slate-hero-action"
            >
              {action.label}
            </Link>
          ))}
        </nav>
      )}

      {showScopeToggle && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {scopeLabel ? (
            <p className="text-sm text-zinc-600">{scopeLabel}</p>
          ) : (
            <span />
          )}
          <Suspense fallback={<SeasonScopeToggleSkeleton />}>
            <SeasonScopeToggle leagueId={leagueId} />
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
    </LeagueHubHero>
  );
}

export type { SlateLeagueId };
