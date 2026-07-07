import type { Metadata } from "next";
import Link from "next/link";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { TermHelp } from "@/components/TermHelp";
import { GameSlateCard } from "@/components/GameSlateCard";
import {
  computeCrewMetrics,
  formatSigned,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/nhl/data";
import { resolveSlateGames } from "@/lib/grudge-match";
import { computeCrewHomeBias, computeSlateHomeBias } from "@/lib/nhl/home-bias";
import { getOdds } from "@/lib/nhl/odds";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
  paceAlerts,
} from "@/lib/nhl/whistle-premium";
import { computeSlatePpPremiums } from "@/lib/nhl/pp-premium";
import { computeSlateOtSignals } from "@/lib/nhl/ot-rate";
import type { AssignmentGame } from "@/lib/types";

export const metadata: Metadata = {
  title: "Tonight's NHL slate — Ref Watch",
  description:
    "Tonight's NHL referee crews with whistle premium, scoring trends, and PIM patterns.",
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

export default function NhlHomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();
  const odds = getOdds();
  const { games: slateGames, isPreview } = resolveSlateGames(
    assignments,
    refStats,
  );
  const sortedGames = sortSlateGames(slateGames, refStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const alertPremiums = paceAlerts(premiums);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const ppPremiums = computeSlatePpPremiums(sortedGames, refStats, odds);
  const otSignals = computeSlateOtSignals(sortedGames, refStats, odds);

  const ppByGame = new Map(ppPremiums.map((p) => [p.gameId, p]));
  const otByGame = new Map(otSignals.map((p) => [p.gameId, p]));

  return (
    <div className="page-shell">
      <section className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Tonight&apos;s NHL slate
        </h1>
        <p className="page-lead">
          Official crew assignments cross-checked against historical goal totals,
          PIM trends, and ref–team history.
        </p>
        <DataFreshnessMeta assignments={assignments} refStats={refStats} league="NHL" />
      </section>

      {slateGames.length === 0 ? (
        <div className="panel-inset px-6 py-10 text-center">
          <p className="text-base font-medium text-zinc-800">
            No NHL games scheduled tonight
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            Run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-border">
              npm run fetch-nhl-assignments
            </code>{" "}
            before puck-drop. Off-season slates will be empty until the schedule
            resumes.
          </p>
          <p className="mt-5">
            <Link
              href="/nhl/teams"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
            >
              Browse team crew histories →
            </Link>
          </p>
        </div>
      ) : (
        <>
          <details className="panel-inset mb-6 px-4 py-3 sm:px-5" open>
            <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
              Tonight&apos;s signals
              {isPreview && (
                <span className="ml-2 font-normal text-zinc-500">
                  (offseason preview)
                </span>
              )}
            </summary>
            <p className="mt-3 text-sm text-zinc-600 md:hidden">
              <TermHelp id="nhl-whistle-premium" /> — tap terms for definitions.
            </p>
            <div className="mt-4 space-y-4 text-sm">
              {alertPremiums.length === 0 &&
                homeBiasSignals.length === 0 &&
                ppPremiums.length === 0 &&
                otSignals.length === 0 && (
                <p className="text-zinc-600">
                  No high-signal pace alerts for this slate.
                </p>
              )}
              {alertPremiums.map((p) => (
                <div
                  key={p.gameId}
                  className="border-l-2 border-zinc-300 pl-3"
                >
                  <p className="font-medium text-zinc-900">{p.matchup}</p>
                  <p className="mt-1 text-zinc-600">
                    <TermHelp id="pace-alert">
                      {p.alert === "high_pace" ? "High pace" : "Low pace"}
                    </TermHelp>{" "}
                    crew — {formatSigned(p.scoringPremium)}{" "}
                    <TermHelp id="nhl-whistle-premium">scoring premium</TermHelp>,{" "}
                    {formatSigned(p.gapVsBenchmark)}{" "}
                    <TermHelp id="line-gap">line gap</TermHelp> vs{" "}
                    {p.benchmarkSource === "sportsbook"
                      ? "book"
                      : String(refStats.meta.leagueOverBaseline)}.
                  </p>
                </div>
              ))}
              {homeBiasSignals.slice(0, 2).map((b) => (
                <div key={b.gameId} className="border-l-2 border-zinc-200 pl-3">
                  <p className="font-medium text-zinc-900">{b.headline}</p>
                </div>
              ))}
              {ppPremiums.slice(0, 3).map((p) => (
                <div key={p.gameId} className="border-l-2 border-emerald-300 pl-3">
                  <p className="font-medium text-zinc-900">{p.matchup}</p>
                  <p className="mt-1 text-zinc-600">
                    <TermHelp id="pp-premium">{p.headline}</TermHelp> — index{" "}
                    {p.index}. {p.summary}
                  </p>
                </div>
              ))}
              {otSignals.slice(0, 2).map((o) => (
                <div key={o.gameId} className="border-l-2 border-sky-300 pl-3">
                  <p className="font-medium text-zinc-900">{o.matchup}</p>
                  <p className="mt-1 text-zinc-600">
                    <TermHelp id="ot-rate-badge">{o.headline}</TermHelp> —{" "}
                    {o.summary}
                  </p>
                </div>
              ))}
            </div>
          </details>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">
              {slateGames.length === 1 ? "Game" : "Games"}
            </h2>
            <div className="space-y-3">
              {sortedGames.map((game) => (
                <GameSlateCard
                  key={game.id}
                  matchup={game.matchup}
                  awayTeam={game.awayTeam}
                  homeTeam={game.homeTeam}
                  metrics={computeCrewMetrics(game.crew, refStats)}
                  premium={computeCrewWhistlePremium(game, refStats, odds)}
                  homeBias={computeCrewHomeBias(game, refStats)}
                  ppPremium={ppByGame.get(game.id) ?? null}
                  otSignal={otByGame.get(game.id) ?? null}
                  sport="nhl"
                  basePath="/nhl"
                  overBenchmark={refStats.meta.leagueOverBaseline}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <details className="methodology-details panel-inset px-4 py-3 sm:px-5">
        <summary>Methodology</summary>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
          <li>
            <TermHelp id="nhl-whistle-premium" /> — crew avg combined goals minus
            league baseline ({refStats.meta.leagueAvgTotal}).
          </li>
          <li>
            <TermHelp id="pace-alert" /> — sample-gated; compares crew history to
            tonight&apos;s line.
          </li>
          <li>
            <TermHelp id="pim" /> tracked as total penalty minutes per game (both
            teams).
          </li>
          <li>
            <TermHelp id="pp-premium" /> — high-minor referees matched against
            both teams&apos; power-play vs penalty-kill efficiency.
          </li>
          <li>
            <TermHelp id="ot-rate-badge" /> — elevated crew OT rate on tight
            puck lines (requires sportsbook spread).
          </li>
          <li>
            <TermHelp id="penalty-balance" /> on ref profiles — descriptive
            game-management pattern, not a live makeup alert.
          </li>
        </ul>
      </details>
    </div>
  );
}
