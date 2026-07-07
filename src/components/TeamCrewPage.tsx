import Link from "next/link";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamRefLeaderboards } from "@/components/TeamRefLeaderboards";
import { TeamSplitView } from "@/components/TeamSplitView";
import {
  formatDate,
  formatPct,
  getRefStats,
  getTeamSplits,
  sortSplitsByGames,
} from "@/lib/data";
import { getTeam, teamFullName, teamWithArticle } from "@/lib/teams";
import {
  getTeamFoulEdgeLeaderboard,
  getTeamRefSplits,
  getTeamScoringPaceLeaderboard,
} from "@/lib/teamRefLeaderboards";

export interface TeamPageConfig {
  teamAbbr: string;
}

export function TeamCrewPage({ config }: { config: TeamPageConfig }) {
  const team = getTeam(config.teamAbbr);
  if (!team) return null;

  const stats = getRefStats();
  const splits = sortSplitsByGames(getTeamSplits(team.abbr));
  const refSplits = getTeamRefSplits(stats.refs, team.abbr);
  const totalGames = splits.reduce((s, sp) => s + sp.games, 0);
  const foulEdgeLeaderboard = getTeamFoulEdgeLeaderboard(stats.refs, team.abbr);
  const scoringPaceLeaderboard = getTeamScoringPaceLeaderboard(
    stats.refs,
    team.abbr,
  );
  const statsSeeded = stats.meta.source === "seeded";
  const teamName = teamFullName(team);
  const teamLabel = teamWithArticle(team);

  return (
    <div className="page-shell">
      <section className="mb-10">
        <div className="flex items-center gap-3">
          <TeamLogo team={team} size="lg" />
          <div>
            <p className="text-sm font-semibold text-zinc-700">{teamName}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
              How {teamLabel} play under each ref crew or ref
            </h1>
          </div>
        </div>
        <p className="page-lead">
          Every {team.name} game grouped by the three referees on the floor, or
          by individual official. Switch tabs to compare full crews vs single
          refs — scoring trends, foul patterns, and records across{" "}
          {stats.meta.seasons.join(" & ")}.
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
          <span>{totalGames} {team.name} games in sample</span>
        </p>
      </section>

      {splits.length === 0 && refSplits.length === 0 ? (
        <div className="panel-inset px-6 py-8 text-center">
          <p className="text-base font-medium text-zinc-800">
            No ref history for {teamName} yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            Run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-border">
              npm run build-ref-data
            </code>{" "}
            to pull historical games from the NBA Stats API.
          </p>
        </div>
      ) : (
        <TeamSplitView
          crewSplits={splits}
          refSplits={refSplits}
          refs={stats.refs}
          teamAbbr={team.abbr}
          teamLabel={teamLabel}
          leagueAvgTotal={stats.meta.leagueAvgTotal}
          leagueAvgFouls={stats.meta.leagueAvgFouls}
          overBaseline={stats.meta.leagueOverBaseline}
        />
      )}

      <TeamRefLeaderboards
        foulEdge={foulEdgeLeaderboard}
        scoringPace={scoringPaceLeaderboard}
        teamAbbr={team.abbr}
        teamLabel={teamLabel}
        overBaseline={stats.meta.leagueOverBaseline}
      />

      <details className="methodology-details panel-inset mt-10 px-5 py-4">
        <summary>What am I looking at?</summary>
        <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-600">
          <li>
            <span className="font-medium text-zinc-800">Ref crews</span> — stats
            when the same three officials worked together on {teamLabel} games.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Individual refs</span> —
            stats for one official across all {team.name} games they worked, even
            with different partners.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Scoring</span> — how
            many combined points these games tend to produce, and how often they
            go above {stats.meta.leagueOverBaseline} (our stand-in when real
            betting lines aren&apos;t available).
          </li>
          <li>
            <span className="font-medium text-zinc-800">Foul edge</span> — who
            gets called more. A positive number means opponents are whistled more
            often than {teamLabel}.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Ref leaderboards</span>{" "}
            — top officials for {teamLabel} by foul edge and scoring pace.
          </li>
        </ul>
        {stats.meta.note && (
          <p className="mt-3 text-xs text-zinc-600">{stats.meta.note}</p>
        )}
      </details>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
          League-wide ref profiles
        </h2>
        <div className="data-card divide-y divide-border-subtle">
          {stats.refs
            .filter((r) => r.games >= stats.meta.minSampleSize)
            .slice(0, 12)
            .map((ref) => (
              <Link
                key={ref.slug}
                href={`/refs/${ref.slug}`}
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
