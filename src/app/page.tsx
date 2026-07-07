import { GameSlateCard } from "@/components/GameSlateCard";
import {
  computeCrewMetrics,
  formatDate,
  getAssignments,
  getRefStats,
} from "@/lib/data";

export default function HomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();

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
        <p className="page-meta">
          <span className="page-meta-live">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Live data
          </span>
          <span>
            Assignments {formatDate(assignments.lastUpdated)} · Stats{" "}
            {formatDate(refStats.meta.lastUpdated)}
          </span>
          <span className="text-zinc-500">
            {assignments.source} / {refStats.meta.source}
          </span>
        </p>
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
          <p className="mt-5 text-sm">
            <a href="/raptors" className="font-medium text-raptors hover:underline">
              Browse Raptors crew splits →
            </a>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.games.map((game) => (
            <GameSlateCard
              key={game.id}
              matchup={game.matchup}
              awayTeam={game.awayTeam}
              homeTeam={game.homeTeam}
              metrics={computeCrewMetrics(game.crew, refStats)}
            />
          ))}
        </div>
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
