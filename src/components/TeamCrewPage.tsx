import Link from "next/link";
import { Suspense } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import { CloseGameSection } from "@/components/CloseGameSection";
import { TeamSplitView } from "@/components/TeamSplitView";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { SeasonScopeToggleSkeleton } from "@/components/LayoutShiftSkeletons";
import * as nbaData from "@/lib/data";
import * as nhlData from "@/lib/nhl/data";
import { filterNhlReferees } from "@/lib/nhl/officials";
import * as nflData from "@/lib/nfl/data";
import * as nbaTeams from "@/lib/teams";
import * as nhlTeams from "@/lib/nhl/teams";
import * as nflTeams from "@/lib/nfl/teams";
import * as laligaData from "@/lib/laliga/data";
import * as eplData from "@/lib/epl/data";
import * as cbbData from "@/lib/cbb/data";
import * as cfbData from "@/lib/cfb/data";
import * as cbbTeams from "@/lib/cbb/teams";
import * as cfbTeams from "@/lib/cfb/teams";
import * as laligaTeams from "@/lib/laliga/teams";
import * as eplTeams from "@/lib/epl/teams";
import { getTeamRefSplits } from "@/lib/teamRefLeaderboards";
import { TEAM_CREW_MIN_GAMES } from "@/lib/teamCrewSplits";
import { formatTeamSampleRecord } from "@/lib/teamRecord";
import { getTeamDisplayRecord } from "@/lib/teamDisplayRecord";
import { resolveTeamCrewSplits } from "@/lib/teamCrewSplits";
import { userFacingDataNote } from "@/lib/user-language";
import { computeTeamCloseGameMetrics } from "@/lib/close-game";
import { TeamPageInsights } from "@/components/TeamPageInsights";
import { loadTeamPageInsightCards } from "@/lib/team-page-insights";
import { TeamRecordSosCard } from "@/components/TeamRecordSosCard";
import { getCachedTeamStrengthOfSchedule } from "@/lib/nba-team-sos-cache";
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import { signedDeltaTone } from "@/lib/metric-delight";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import type { SeasonScopeMode } from "@/lib/season-scope";
import { DEFAULT_SEASON_SCOPE_MODE, usesPatriotsEraScope } from "@/lib/season-scope";

const LEAGUE_MODULES = {
  nba: { data: nbaData, teams: nbaTeams, basePath: "", dataLeague: "NBA" as const, crewSize: "three", surface: "court" },
  nhl: { data: nhlData, teams: nhlTeams, basePath: "/nhl", dataLeague: "NHL" as const, crewSize: "four", surface: "ice" },
  nfl: { data: nflData, teams: nflTeams, basePath: "/nfl", dataLeague: "NFL" as const, crewSize: "seven", surface: "field" },
  epl: { data: eplData, teams: eplTeams, basePath: "/epl", dataLeague: "EPL" as const, crewSize: "one", surface: "pitch" },
  laliga: { data: laligaData, teams: laligaTeams, basePath: "/laliga", dataLeague: "LALIGA" as const, crewSize: "one", surface: "pitch" },
  cbb: { data: cbbData, teams: cbbTeams, basePath: "/cbb", dataLeague: "CBB" as const, crewSize: "three", surface: "court" },
  cfb: { data: cfbData, teams: cfbTeams, basePath: "/cfb", dataLeague: "CFB" as const, crewSize: "seven", surface: "field" },
};

export interface TeamPageConfig {
  teamAbbr: string;
  league?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
}

export function TeamCrewPage({
  config,
  scopeMode = DEFAULT_SEASON_SCOPE_MODE,
}: {
  config: TeamPageConfig;
  scopeMode?: SeasonScopeMode;
}) {
  const league = config.league ?? "nba";
  const mod = LEAGUE_MODULES[league];
  const basePath = mod.basePath;
  const { getTeam, teamFullName, teamWithArticle } = mod.teams;
  const { sortSplitsByGames, formatDate, formatPct, getTeamSplits } = mod.data;

  const team = getTeam(config.teamAbbr);
  if (!team) return null;

  const {
    stats,
    sinceSeason,
    scopeLabel,
    formatRange,
    availableSeasons,
  } = loadScopedLeagueStats(league, scopeMode, { teamAbbr: team.abbr });

  const isNhl = league === "nhl";
  const isNfl = league === "nfl" || league === "cfb";
  const isRefsOnly = league === "cbb";
  const showPatriotsEra = usesPatriotsEraScope(league, { teamAbbr: team.abbr });
  const analyticsRefs = isNhl ? filterNhlReferees(stats.refs) : stats.refs;
  const splits = sortSplitsByGames(
    resolveTeamCrewSplits(stats, team.abbr, getTeamSplits),
  );
  const refSplits = getTeamRefSplits(analyticsRefs, team.abbr);
  const teamRecord = getTeamDisplayRecord(
    league,
    team.abbr,
    splits,
    stats.meta.seasons,
    { sinceSeason },
  );
  const teamName = teamFullName(team as never);
  const teamLabel = teamWithArticle(team as never);
  const crewSize = mod.crewSize;
  const playingSurface = mod.surface;
  const dataLeague = mod.dataLeague;
  const closeGameMetrics = computeTeamCloseGameMetrics(
    team.abbr,
    stats.meta,
    dataLeague,
  );
  const teamSos =
    league === "nba" ? getCachedTeamStrengthOfSchedule(team.abbr) : null;
  const teamInsightCards = loadTeamPageInsightCards(league, team.abbr);

  return (
    <div className="page-shell" data-league={league}>
      <section className="page-hero page-hero-team" data-league={league}>
        <div className="page-hero-head">
          <TeamLogo team={team} size="lg" sport={league} />
          <div className="page-hero-head-copy">
            <p className="section-kicker team-page-kicker">{teamName}</p>
            <h1 className="page-title">
              {isRefsOnly
                ? `How ${teamLabel} play under each referee`
                : `How ${teamLabel} play under each ref or ref crew`}
            </h1>
          </div>
        </div>
        <p className="page-lead">
          {isRefsOnly ? (
            <>
              Every {team.name} game grouped by individual referee. Over this sample{" "}
              {teamLabel} are {formatTeamSampleRecord(teamRecord)}; each ref win rate
              below is compared to that team average.
            </>
          ) : (
            <>
              Every {team.name} game grouped by individual official, or by the same{" "}
              {crewSize} officials on the {playingSurface}. Over this sample {teamLabel}{" "}
              are {formatTeamSampleRecord(teamRecord)}; each ref and crew win rate below
              is compared to that team average.
            </>
          )}
        </p>
        <p className="page-meta">
          <span className="page-meta-updated">
            Updated {formatDate(stats.meta.lastUpdated)}
          </span>
          <span className="mx-2 text-zinc-300">·</span>
          <span>{scopeLabel} ({formatRange(stats.meta)})</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {showPatriotsEra ? (
            <p className="text-sm font-medium text-muted-strong">Era scope</p>
          ) : (
            <span />
          )}
          <Suspense fallback={<SeasonScopeToggleSkeleton />}>
            <SeasonScopeToggle
              leagueId={showPatriotsEra ? league : undefined}
              teamAbbr={showPatriotsEra ? team.abbr : undefined}
              availableSeasons={availableSeasons}
            />
          </Suspense>
        </div>
        {teamSos ? (
          <TeamRecordSosCard
            record={teamRecord}
            sos={teamSos}
            teamName={team.name}
            className="mt-4"
          />
        ) : (
          <p className="page-meta mt-4">
            <span>
              {team.name} record: {formatTeamSampleRecord(teamRecord)}
            </span>
          </p>
        )}
      </section>

      <TeamPageInsights cards={teamInsightCards} teamLabel={teamLabel} />

      {splits.length === 0 && refSplits.length === 0 ? (
        <div className="team-empty-callout panel-inset px-6 py-8" data-league={league}>
          <p className="team-empty-callout-badge">Sample building</p>
          <p className="text-base font-medium text-zinc-800 dark:text-zinc-100">
            No ref history for {teamName} yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {isRefsOnly
              ? `We don't have enough referee history for ${teamLabel} in the current dataset. Check back after the next data refresh, or browse other teams with fuller samples.`
              : `We don't have enough crew-level games for ${teamLabel} in the current dataset. Check back after the next data refresh, or browse other teams with fuller samples.`}
          </p>
          <Link
            href={`${basePath || ""}/teams`}
            className="team-empty-callout-link mt-4 inline-block text-sm"
          >
            Browse all teams →
          </Link>
        </div>
      ) : (
        <TeamSplitView
          crewSplits={splits}
          refSplits={refSplits}
          refs={analyticsRefs}
          teamAbbr={team.abbr}
          teamLabel={teamLabel}
          teamRecord={teamRecord}
          leagueAvgTotal={stats.meta.leagueAvgTotal}
          leagueAvgFouls={stats.meta.leagueAvgFouls}
          overBaseline={stats.meta.leagueOverBaseline}
          basePath={basePath}
          sport={league}
        />
      )}

      <CloseGameSection
        metrics={closeGameMetrics}
        subjectLabel={teamName}
        league={dataLeague}
      />

      <details className="methodology-details methodology-details--accent panel-inset mt-10 px-5 py-4">
        <summary>What am I looking at?</summary>
        <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-600">
          <li>
            <span className="font-medium text-zinc-800">Individual refs</span>:
            stats for one official across all {team.name} games they worked, even
            with different partners.
          </li>
          {!isRefsOnly ? (
            <li>
              <span className="font-medium text-zinc-800">Ref crews</span>: stats
              when the same {crewSize} officials worked together on {teamLabel}{" "}
              games ({TEAM_CREW_MIN_GAMES}+ games shown by default).
            </li>
          ) : null}
          <li>
            <span className="font-medium text-zinc-800">Team baseline</span>:{" "}
            {teamLabel} went {formatTeamSampleRecord(teamRecord)} across this
            sample. Ref{isRefsOnly ? "" : " and crew"} win
            rates show how they compare to that team average.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Whistle differential</span>:{" "}
            {isNhl
              ? "PIM differential. A positive number means opponents are penalized more often than"
              : isNfl
                ? "flag differential. A positive number means opponents are flagged more often than"
                : "who gets called more. A positive number means opponents are whistled more often than"}{" "}
            {teamLabel}.
          </li>
        </ul>
        {userFacingDataNote(stats.meta.note) && (
          <p className="mt-3 text-xs text-zinc-600">
            {userFacingDataNote(stats.meta.note)}
          </p>
        )}
      </details>

      <section className="section-block team-ref-profiles-section" data-league={league}>
        <h2 className="section-title">League-wide ref profiles</h2>
        <div className="data-card divide-y divide-border-subtle">
          {analyticsRefs
            .filter((r) => r.games >= stats.meta.minSampleSize)
            .slice(0, 12)
            .map((ref) => {
              const overDeltaPp = (ref.overRate - 0.5) * 100;
              return (
              <Link
                key={ref.slug}
                href={`${basePath}/refs/${ref.slug}`}
                className="team-ref-profile-row flex items-center gap-4 px-5 py-3 text-sm transition"
              >
                <span className="min-w-0 flex-1 font-medium text-zinc-800 dark:text-zinc-100">
                  {ref.name}
                </span>
                <span className="shrink-0 text-right font-mono text-xs leading-snug tabular-nums text-zinc-600 dark:text-zinc-400">
                  <StandoutMetricValue tone={signedDeltaTone(overDeltaPp)} size="md">
                    {formatPct(ref.overRate)}
                  </StandoutMetricValue>{" "}
                  over {stats.meta.leagueOverBaseline}
                </span>
              </Link>
              );
            })}
        </div>
      </section>
    </div>
  );
}
