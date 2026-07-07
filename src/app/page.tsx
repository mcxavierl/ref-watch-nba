import type { Metadata } from "next";
import Link from "next/link";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { GameSlateCard } from "@/components/GameSlateCard";
import {
  computeCrewMetrics,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/data";
import type { AssignmentGame } from "@/lib/types";

export const metadata: Metadata = {
  title: "Tonight's NBA slate — Ref Watch",
  description:
    "See tonight's NBA referee crews with scoring and foul trends, plus links to all 30 team crew histories.",
};

function sortSlateGames(
  games: AssignmentGame[],
  refStats: ReturnType<typeof getRefStats>,
) {
  return [...games].sort((a, b) => {
    const aMetrics = computeCrewMetrics(a.crew, refStats);
    const bMetrics = computeCrewMetrics(b.crew, refStats);
    const leanDiff =
      ouLeanSortWeight(bMetrics.ouLean) - ouLeanSortWeight(aMetrics.ouLean);
    if (leanDiff !== 0) return leanDiff;

    return a.matchup.localeCompare(b.matchup);
  });
}

export default function HomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();
  const sortedGames = sortSlateGames(assignments.games, refStats);
  const hotCrews = sortedGames
    .map((game) => ({
      game,
      metrics: computeCrewMetrics(game.crew, refStats),
    }))
    .filter(({ metrics }) => metrics.ouLean !== "neutral")
    .slice(0, 3);

  return (
    <div className="page-shell">
      <section className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
          Tonight&apos;s slate
        </h1>
        <p className="page-lead">
          Ref Watch shows how tonight&apos;s referee crews have historically
          affected scoring and fouls — then links you to team-specific history
          for all 30 NBA teams.
        </p>
        <DataFreshnessMeta assignments={assignments} refStats={refStats} />
      </section>

      {assignments.games.length === 0 ? (
        <div className="panel-inset px-6 py-10 text-center">
          <p className="text-base font-medium text-zinc-800">
            No NBA games scheduled tonight
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            The official assignments page has no NBA rows for{" "}
            {assignments.date}. Run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-border">
              npm run build-ref-data
            </code>{" "}
            before tip-off nights to refresh.
          </p>
          <p className="mt-5">
            <Link
              href="/teams"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
            >
              Browse all 30 team crew histories →
            </Link>
          </p>
        </div>
      ) : (
        <>
          {hotCrews.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-zinc-700">
                Notable scoring trends tonight
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Games where the crew history points toward unusually high- or
                low-scoring games.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {hotCrews.map(({ game, metrics }) => (
                  <li
                    key={game.id}
                    className="rounded-md border border-border bg-surface-raised px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-zinc-800">
                      {game.matchup}
                    </span>
                    <span className="ml-2 font-mono tabular-nums text-zinc-600">
                      {metrics.ouLean === "over"
                        ? "Higher scoring"
                        : "Lower scoring"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">
              {assignments.games.length === 1
                ? "Tonight's game"
                : "All games tonight"}
            </h2>
            <div className="space-y-3">
              {sortedGames.map((game) => (
                <GameSlateCard
                  key={game.id}
                  matchup={game.matchup}
                  awayTeam={game.awayTeam}
                  homeTeam={game.homeTeam}
                  metrics={computeCrewMetrics(game.crew, refStats)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <details className="methodology-details panel-inset mt-10 px-5 py-4">
        <summary>How we calculate these numbers</summary>
        <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-600">
          <li>
            <span className="font-medium text-zinc-800">Avg combined score</span>{" "}
            — the typical total points scored by both teams in games this crew
            worked.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Games over 225 pts</span>{" "}
            — how often combined scoring beat {refStats.meta.leagueOverBaseline}{" "}
            (we use this fixed number when real betting lines aren&apos;t
            available).
          </li>
          <li>
            <span className="font-medium text-zinc-800">Fouls per game</span> —
            total personal fouls from both teams — a rough measure of how often
            the whistle blows.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Scoring trend</span> —
            we flag crews that tend toward higher or lower scoring based on
            history.
          </li>
        </ul>
      </details>
    </div>
  );
}
