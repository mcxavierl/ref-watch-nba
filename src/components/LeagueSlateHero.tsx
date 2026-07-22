import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { Suspense } from "react";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { SeasonScopeToggleSkeleton } from "@/components/LayoutShiftSkeletons";
import { LEAGUES } from "@/lib/leagues";
import { leagueHeroCopy } from "@/lib/league-hero-copy";
import { nbaSeasonScopeAuditNote } from "@/lib/nba-team-season-records";
import { isOffseasonSlate, isPendingCrewSlate } from "@/lib/offseason";
import { slateHeroActions } from "@/lib/slate-hero-links";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

type SlateLeagueId = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba";

type LeagueSlateHeroProps = {
  leagueId: SlateLeagueId;
  assignments: AssignmentsFile;
  refStats: RefStatsFile;
  productHome?: boolean;
  showScopeToggle?: boolean;
  scopeLabel?: string;
};

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
  const seasonAuditNote =
    leagueId === "nba" ? nbaSeasonScopeAuditNote(refStats.meta.seasons) : null;
  const useInteractiveStats = isOffseason;
  const heroActions = slateHeroActions(leagueId);
  const heroTitle = isOffseason
    ? copy.offseasonTitle
    : isPending
      ? (copy.pendingTitle ?? copy.liveTitle)
      : copy.liveTitle;
  const heroLead = isOffseason
    ? copy.offseasonLead
    : isPending
      ? (copy.pendingLead ?? copy.liveLead)
      : copy.liveLead;

  return (
    <LeagueHubHero
      leagueId={leagueId}
      className={`page-hero-slate league-slate-hero${useInteractiveStats ? " league-slate-hero-product" : ""}`}
      aria-labelledby={`${leagueId}-slate-heading`}
    >
      <p className="league-slate-kicker">{copy.kicker}</p>
      <h1 className="page-title" id={`${leagueId}-slate-heading`}>
        {heroTitle}
      </h1>
      <p className="page-lead league-slate-hero-banner">{heroLead}</p>

      {heroActions.length > 0 && (
        <nav
          className="league-slate-hero-actions"
          aria-label="Explore league analytics"
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
        className="league-hub-hero-freshness"
        league={
          config.dataLeague === "NBA" ||
          config.dataLeague === "NHL" ||
          config.dataLeague === "NFL" ||
          config.dataLeague === "CBB" ||
          config.dataLeague === "CFB" ||
          config.dataLeague === "WNBA"
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
