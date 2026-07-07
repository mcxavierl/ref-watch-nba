import Link from "next/link";
import { TeamLogo } from "@/components/TeamLogo";
import { CloseGameSection } from "@/components/CloseGameSection";
import { TeamRefLeaderboards } from "@/components/TeamRefLeaderboards";
import { TeamSplitView } from "@/components/TeamSplitView";
import * as nbaData from "@/lib/data";
import * as nhlData from "@/lib/nhl/data";
import * as nbaTeams from "@/lib/teams";
import * as nhlTeams from "@/lib/nhl/teams";
import {
  getTeamRefSplits,
  TEAM_REF_MIN_GAMES,
} from "@/lib/teamRefLeaderboards";
import { getTeamSampleRecord } from "@/lib/teamRecord";
import { userFacingDataNote } from "@/lib/user-language";
import { computeTeamCloseGameMetrics } from "@/lib/close-game";

export interface TeamPageConfig {
  teamAbbr: string;
  league?: "nba" | "nhl";
}

export function TeamCrewPage({ config }: { config: TeamPageConfig }) {
  const league = config.league ?? "nba";
  const isNhl = league === "nhl";
  const basePath = isNhl ? "/nhl" : "";
  const getTeam = isNhl ? nhlTeams.getTeam : nbaTeams.getTeam;
  const getRefStats = isNhl ? nhlData.getRefStats : nbaData.getRefStats;
  const getTeamSplits = isNhl ? nhlData.getTeamSplits : nbaData.getTeamSplits;
  const sortSplitsByGames = isNhl ? nhlData.sortSplitsByGames : nbaData.sortSplitsByGames;
  const formatDate = isNhl ? nhlData.formatDate : nbaData.formatDate;
  const formatPct = isNhl ? nhlData.formatPct : nbaData.formatPct;

  const team = getTeam(config.teamAbbr);
  if (!team) return null;

  const stats = getRefStats();
  const splits = sortSplitsByGames(getTeamSplits(team.abbr));
  const refSplits = getTeamRefSplits(stats.refs, team.abbr);
  const teamRecord = getTeamSampleRecord(splits);
  const statsSeeded = stats.meta.source === "seeded";
  const teamName = isNhl
    ? nhlTeams.teamFullName(team as import("@/lib/nhl/teams").NhlTeam)
    : nbaTeams.teamFullName(team as import("@/lib/teams").NbaTeam);
  const teamLabel = isNhl
    ? nhlTeams.teamWithArticle(team as import("@/lib/nhl/teams").NhlTeam)
    : nbaTeams.teamWithArticle(team as import("@/lib/teams").NbaTeam);
  const crewSize = isNhl ? "four" : "three";
  const closeGameMetrics = computeTeamCloseGameMetrics(
    team.abbr,
    stats.meta,
    isNhl ? "NHL" : "NBA",
  );

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="flex items-center gap-3">
          <TeamLogo team={team} size="lg" sport={league} />
          <div>
            <p className="section-kicker">{teamName}</p>
            <h1 className="page-title">
              How {teamLabel} play under each ref crew or ref
            </h1>
          </div>
        </div>
        <p className="page-lead">
          Every {team.name} game grouped by the same {crewSize} officials on the
          ice, or by individual official. Over this sample {teamLabel} are{" "}
          {teamRecord.wins}-{teamRecord.losses} ({formatPct(teamRecord.winRate)}
          ) — each ref and crew win rate below is compared to that team average.
        </p>
        <p className="page-meta">
          <span
            className={statsSeeded ? "page-meta-seeded" : "page-meta-live"}
          >
            <span
              className={`size-1.5 rounded-full ${statsSeeded ? "bg-amber-500" : "bg-emerald-500"}`}
              aria-hidden
            />
            {statsSeeded ? "Sample data" : "Live data"}
          </span>
          <span>Updated {formatDate(stats.meta.lastUpdated)}</span>
          <span>
            {team.name} sample: {teamRecord.wins}-{teamRecord.losses} (
            {formatPct(teamRecord.winRate)})
          </span>
        </p>
      </section>

      {splits.length === 0 && refSplits.length === 0 ? (
        <div className="panel-inset px-6 py-8 text-center">
          <p className="text-base font-medium text-zinc-800">
            No ref history for {teamName} yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
            We don&apos;t have enough crew-level games for {teamLabel} in the
            current dataset. Check back after the next data refresh, or browse
            other teams with fuller samples.
          </p>
          <Link
            href={isNhl ? "/nhl/teams" : "/teams"}
            className="mt-4 inline-block text-sm font-semibold text-zinc-800 hover:text-raptors hover:underline"
          >
            Browse all teams →
          </Link>
        </div>
      ) : (
        <TeamSplitView
          crewSplits={splits}
          refSplits={refSplits}
          refs={stats.refs}
          teamAbbr={team.abbr}
          teamLabel={teamLabel}
          teamRecord={teamRecord}
          leagueAvgTotal={stats.meta.leagueAvgTotal}
          leagueAvgFouls={stats.meta.leagueAvgFouls}
          overBaseline={stats.meta.leagueOverBaseline}
          basePath={basePath}
        />
      )}

      <TeamRefLeaderboards
        entries={refSplits}
        teamLabel={teamLabel}
        teamRecord={teamRecord}
        overBaseline={stats.meta.leagueOverBaseline}
        basePath={basePath}
      />

      <CloseGameSection
        metrics={closeGameMetrics}
        subjectLabel={teamName}
        league={isNhl ? "NHL" : "NBA"}
      />

      <details className="methodology-details panel-inset mt-10 px-5 py-4">
        <summary>What am I looking at?</summary>
        <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-600">
          <li>
            <span className="font-medium text-zinc-800">Ref crews</span> — stats
            when the same {crewSize} officials worked together on {teamLabel}{" "}
            games.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Individual refs</span> —
            stats for one official across all {team.name} games they worked, even
            with different partners.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Team baseline</span> —{" "}
            {teamLabel} went {teamRecord.wins}-{teamRecord.losses} (
            {formatPct(teamRecord.winRate)}) across this sample. Ref and crew win
            rates show how they compare to that team average.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Foul edge</span> —{" "}
            {isNhl
              ? "PIM differential. A positive number means opponents are penalized more often than"
              : "who gets called more. A positive number means opponents are whistled more often than"}{" "}
            {teamLabel}.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Ref rankings</span> —
            sortable list of officials for {teamLabel} by win rate, foul edge, or
            scoring pace ({TEAM_REF_MIN_GAMES}+ games minimum).
          </li>
        </ul>
        {userFacingDataNote(stats.meta.note) && (
          <p className="mt-3 text-xs text-zinc-600">
            {userFacingDataNote(stats.meta.note)}
          </p>
        )}
      </details>

      <section className="section-block">
        <h2 className="section-title">League-wide ref profiles</h2>
        <div className="data-card divide-y divide-border-subtle">
          {stats.refs
            .filter((r) => r.games >= stats.meta.minSampleSize)
            .slice(0, 12)
            .map((ref) => (
              <Link
                key={ref.slug}
                href={`${basePath}/refs/${ref.slug}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-800">{ref.name}</span>
                <span className="font-mono text-xs tabular-nums text-zinc-600">
                  {formatPct(ref.overRate)} over {stats.meta.leagueOverBaseline}
                </span>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
