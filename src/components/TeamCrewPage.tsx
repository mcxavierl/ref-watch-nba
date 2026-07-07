import Link from "next/link";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamRefLeaderboards } from "@/components/TeamRefLeaderboards";
import { StatCell, StatSection, StatStrip } from "@/components/StatStrip";
import {
  formatDate,
  formatPct,
  formatSigned,
  getRefStats,
  getTeamSplits,
  sortSplitsByGames,
  whistleBias,
} from "@/lib/data";
import {
  getOuLeanAnnotation,
  getWhistleAnnotation,
} from "@/lib/leanAnnotations";
import { getTeam, teamFullName } from "@/lib/teams";
import {
  getTeamFoulEdgeLeaderboard,
  getTeamScoringPaceLeaderboard,
} from "@/lib/teamRefLeaderboards";
import type { RefProfile, TeamCrewSplit } from "@/lib/types";

export interface TeamPageConfig {
  teamAbbr: string;
}

function winPct(wins: number, games: number): string {
  if (games === 0) return "—";
  return formatPct(wins / games);
}

function TeamSplitCard({
  split,
  leagueAvgTotal,
  leagueAvgFouls,
  overBaseline,
  refs,
  teamAbbr,
}: {
  split: TeamCrewSplit;
  leagueAvgTotal: number;
  leagueAvgFouls: number;
  overBaseline: number;
  refs: Pick<RefProfile, "slug" | "name">[];
  teamAbbr: string;
}) {
  const ouLean = getOuLeanAnnotation(
    split.overRate,
    split.avgTotalPoints,
    leagueAvgTotal,
  );
  const bias = whistleBias(split.foulDifferential);
  const whistleAnnotation = getWhistleAnnotation(bias, teamAbbr);
  const foulsDelta = Math.round((split.avgFouls - leagueAvgFouls) * 10) / 10;

  return (
    <article className="data-card">
      <div className="border-b border-border bg-surface-raised/60 px-4 py-3">
        <h2 className="text-sm font-semibold leading-snug text-zinc-900">
          {split.crewNames.join(" · ")}
        </h2>
        <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-600">
          {split.games} games · {split.wins}-{split.losses} (
          {winPct(split.wins, split.games)} wins)
        </p>
      </div>

      <StatSection title="Scoring">
        <StatStrip>
          <StatCell
            label="Avg combined score"
            value={String(split.avgTotalPoints)}
            detail={`${formatSigned(split.totalDelta)} vs league avg (${leagueAvgTotal})`}
            annotation={
              ouLean?.target === "avgTotal" ? ouLean.label : undefined
            }
          />
          <StatCell
            label={`Games over ${overBaseline} pts`}
            value={formatPct(split.overRate)}
            detail="Combined score beat the league benchmark"
            annotation={
              ouLean?.target === "overRate" ? ouLean.label : undefined
            }
          />
          <StatCell
            label="Win-loss record"
            value={`${split.wins}-${split.losses}`}
            detail={`${winPct(split.wins, split.games)} win rate`}
          />
        </StatStrip>
      </StatSection>

      <StatSection title="Fouls & whistles">
        <StatStrip>
          <StatCell
            label="Total fouls per game"
            value={String(split.avgFouls)}
            detail={`${formatSigned(foulsDelta)} vs league avg (${leagueAvgFouls})`}
          />
          <StatCell
            label={`${teamAbbr} fouls`}
            value={String(split.avgTeamFouls)}
            detail="Called on this team"
          />
          <StatCell
            label="Opponent fouls"
            value={String(split.avgOpponentFouls)}
            detail="Called on the other team"
          />
          <StatCell
            label="Foul edge"
            value={formatSigned(split.foulDifferential)}
            detail="Positive = more fouls on opponents"
            annotation={whistleAnnotation}
          />
        </StatStrip>
      </StatSection>

      <StatSection title="Home & away">
        <StatStrip>
          <StatCell
            label="Home record"
            value={`${split.homeWins}-${split.homeLosses}`}
            detail={`${split.homeGames} home games`}
          />
          <StatCell
            label="Away record"
            value={`${split.awayWins}-${split.awayLosses}`}
            detail={`${split.awayGames} away games`}
          />
          <StatCell
            label="Home win rate"
            value={winPct(split.homeWins, split.homeGames)}
          />
          <StatCell
            label="Away win rate"
            value={winPct(split.awayWins, split.awayGames)}
          />
        </StatStrip>
      </StatSection>

      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border-subtle px-4 py-2.5">
        {split.crewNames.map((name) => {
          const ref = refs.find((r) => r.name === name);
          if (!ref) return null;
          return (
            <Link
              key={ref.slug}
              href={`/refs/${ref.slug}`}
              className="text-[11px] text-zinc-600 transition hover:text-zinc-900"
            >
              {name} →
            </Link>
          );
        })}
      </div>
    </article>
  );
}

export function TeamCrewPage({ config }: { config: TeamPageConfig }) {
  const team = getTeam(config.teamAbbr);
  if (!team) return null;

  const stats = getRefStats();
  const splits = sortSplitsByGames(getTeamSplits(team.abbr));
  const totalGames = splits.reduce((s, sp) => s + sp.games, 0);
  const foulEdgeLeaderboard = getTeamFoulEdgeLeaderboard(stats.refs, team.abbr);
  const scoringPaceLeaderboard = getTeamScoringPaceLeaderboard(
    stats.refs,
    team.abbr,
  );
  const statsSeeded = stats.meta.source === "seeded";
  const teamName = teamFullName(team);

  return (
    <div className="page-shell">
      <section className="mb-10">
        <div className="flex items-center gap-3">
          <TeamLogo team={team} size="lg" />
          <div>
            <p className="text-sm font-semibold text-zinc-700">{teamName}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
              How this team plays under each ref crew
            </h1>
          </div>
        </div>
        <p className="page-lead">
          Every {team.abbr} game worked by the same three referees, grouped
          together. See scoring trends, foul patterns, and home/away records for
          each crew across {stats.meta.seasons.join(" & ")}.
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
          <span>{totalGames} team games in sample</span>
        </p>
      </section>

      {splits.length === 0 ? (
        <div className="panel-inset px-6 py-8 text-center">
          <p className="text-base font-medium text-zinc-800">
            No crew history for {teamName} yet
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
        <div className="space-y-3">
          {splits.map((split) => (
            <TeamSplitCard
              key={split.crewKey}
              split={split}
              leagueAvgTotal={stats.meta.leagueAvgTotal}
              leagueAvgFouls={stats.meta.leagueAvgFouls}
              overBaseline={stats.meta.leagueOverBaseline}
              refs={stats.refs}
              teamAbbr={team.abbr}
            />
          ))}
        </div>
      )}

      <TeamRefLeaderboards
        foulEdge={foulEdgeLeaderboard}
        scoringPace={scoringPaceLeaderboard}
        teamAbbr={team.abbr}
        overBaseline={stats.meta.leagueOverBaseline}
      />

      <details className="methodology-details panel-inset mt-10 px-5 py-4">
        <summary>What am I looking at?</summary>
        <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-600">
          <li>
            <span className="font-medium text-zinc-800">Scoring</span> — how
            many combined points these games tend to produce, and how often they
            go above {stats.meta.leagueOverBaseline} (our stand-in when real
            betting lines aren&apos;t available).
          </li>
          <li>
            <span className="font-medium text-zinc-800">Foul edge</span> — who
            gets called more under this crew. A positive number means opponents
            are whistled more often than {team.abbr}.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Home & away</span> — win
            rate by location. Small samples (under 5 games) are rough guides
            only.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Ref leaderboards</span>{" "}
            — individual officials ranked for {team.abbr} games only (not full
            crews). Foul edge is average opponent fouls minus {team.abbr}{" "}
            fouls. Scoring pace is average combined game total.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Win-loss record</span> —
            straight-up results, not point spreads.
          </li>
        </ul>
        {stats.meta.note && (
          <p className="mt-3 text-xs text-zinc-600">{stats.meta.note}</p>
        )}
      </details>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
          Referees with enough games ({stats.meta.minSampleSize}+)
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
