import type { Metadata } from "next";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { GameSlateCard } from "@/components/GameSlateCard";
import {
  computeCrewMetrics,
  gameInvolvesTrackedTeam,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/data";
import type { AssignmentGame } from "@/lib/types";

export const metadata: Metadata = {
  title: "Tonight's NBA slate — Ref Watch",
  description:
    "Tonight's NBA referee crews with composite O/U lean, foul pace, and quick links to Raptors and Lakers crew splits.",
};

function sortSlateGames(
  games: AssignmentGame[],
  refStats: ReturnType<typeof getRefStats>,
) {
  return [...games].sort((a, b) => {
    const aFeatured = gameInvolvesTrackedTeam(a);
    const bFeatured = gameInvolvesTrackedTeam(b);
    if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;

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
  const featuredGames = sortedGames.filter(gameInvolvesTrackedTeam);
  const otherGames = sortedGames.filter((g) => !gameInvolvesTrackedTeam(g));
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
          Crew-level composite metrics from each referee&apos;s historical
          sample (min {refStats.meta.minSampleSize} games). Over rate uses a{" "}
          {refStats.meta.leagueOverBaseline} fixed baseline when closing lines
          are unavailable.
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
          <p className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
            <a href="/raptors" className="font-medium text-raptors hover:underline">
              Raptors crew splits →
            </a>
            <a href="/lakers" className="font-medium text-lakers hover:underline">
              Lakers crew splits →
            </a>
          </p>
        </div>
      ) : (
        <>
          {hotCrews.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-zinc-700">
                Hot crews tonight
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Games with a non-neutral O/U lean from crew history, strongest
                first.
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
                      {metrics.ouLean === "over" ? "Over lean" : "Under lean"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {featuredGames.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">
                Raptors & Lakers tonight
              </h2>
              <div className="space-y-3">
                {featuredGames.map((game) => (
                  <GameSlateCard
                    key={game.id}
                    matchup={game.matchup}
                    awayTeam={game.awayTeam}
                    homeTeam={game.homeTeam}
                    metrics={computeCrewMetrics(game.crew, refStats)}
                    featured
                  />
                ))}
              </div>
            </section>
          )}

          {otherGames.length > 0 && (
            <section>
              {featuredGames.length > 0 && (
                <h2 className="mb-3 text-sm font-semibold text-zinc-700">
                  Rest of slate
                </h2>
              )}
              <div className="space-y-3">
                {otherGames.map((game) => (
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
          )}
        </>
      )}

      <details className="methodology-details panel-inset mt-10 px-5 py-4">
        <summary>Methodology</summary>
        <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-600">
          <li>
            <span className="font-medium text-zinc-800">Avg total points</span> — mean
            combined score in games this ref crew worked.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Over rate</span> — share of games
            finishing above {refStats.meta.leagueOverBaseline} (proxy when
            closing totals unavailable).
          </li>
          <li>
            <span className="font-medium text-zinc-800">Avg fouls</span> — total personal
            fouls from box scores (crew whistle proxy).
          </li>
          <li>
            <span className="font-medium text-zinc-800">O/U lean</span> — from over rate +
            total delta vs league ({">"}56% or +3 → over; {"<"}44% or -3 →
            under).
          </li>
        </ul>
      </details>
    </div>
  );
}
