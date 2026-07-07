import type { Metadata } from "next";
import Link from "next/link";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { FeatureRoadmap } from "@/components/FeatureRoadmap";
import { FindingsSection } from "@/components/FindingsSection";
import { GameSlateCard } from "@/components/GameSlateCard";
import { GrudgeMatchSection } from "@/components/GrudgeMatchSection";
import { WhistlePremiumSection } from "@/components/WhistlePremiumSection";
import {
  computeCrewMetrics,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/data";
import { computeFindings } from "@/lib/findings";
import {
  computeGameStorylines,
  computeSlateStorylines,
  resolveSlateGames,
} from "@/lib/grudge-match";
import { computeCrewHomeBias, computeSlateHomeBias } from "@/lib/home-bias";
import { getOdds } from "@/lib/odds";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
  paceAlerts,
} from "@/lib/whistle-premium";
import type { AssignmentGame } from "@/lib/types";

export const metadata: Metadata = {
  title: "Tonight's NBA slate — Ref Watch",
  description:
    "Whistle premium alerts, grudge-match storylines, and crew home bias for tonight's NBA referee assignments.",
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

function oddsSourceLabel(
  premiums: ReturnType<typeof computeSlatePremiums>,
): "sportsbook" | "league_proxy" | "mixed" {
  const hasBook = premiums.some((p) => p.benchmarkSource === "sportsbook");
  const hasProxy = premiums.some((p) => p.benchmarkSource === "league_proxy");
  if (hasBook && hasProxy) return "mixed";
  if (hasBook) return "sportsbook";
  return "league_proxy";
}

export default function HomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();
  const odds = getOdds();
  const findings = computeFindings();
  const { games: slateGames, isPreview } = resolveSlateGames(
    assignments,
    refStats,
  );
  const sortedGames = sortSlateGames(slateGames, refStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const alertPremiums = paceAlerts(premiums);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const slateStorylines = computeSlateStorylines(sortedGames, refStats);

  return (
    <div className="page-shell">
      <section className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Tonight&apos;s slate
        </h1>
        <p className="page-lead">
          Crew whistle premium vs league (and sportsbook totals when available),
          grudge-match flags, and home/road bias — refreshed each morning with
          official assignments.
        </p>
        <DataFreshnessMeta assignments={assignments} refStats={refStats} />
      </section>

      {slateGames.length > 0 && (
        <WhistlePremiumSection
          paceAlerts={alertPremiums}
          homeBiasSignals={homeBiasSignals}
          isPreview={isPreview}
          oddsSource={oddsSourceLabel(premiums)}
        />
      )}

      <GrudgeMatchSection
        storylines={slateStorylines}
        isPreview={isPreview}
      />

      <FindingsSection findings={findings} />

      {slateGames.length === 0 ? (
        <div className="panel-inset px-6 py-10 text-center">
          <p className="text-base font-medium text-zinc-800">
            No NBA games scheduled tonight
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            The official assignments page has no NBA rows for{" "}
            {assignments.date}. Run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-border">
              npm run morning-slate
            </code>{" "}
            before tip-off (or{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-border">
              npm run build-ref-data
            </code>
            ).
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
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">
            {isPreview
              ? "Preview games (sample alerts)"
              : slateGames.length === 1
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
                premium={computeCrewWhistlePremium(game, refStats, odds)}
                homeBias={computeCrewHomeBias(game, refStats)}
                storylines={computeGameStorylines(game, refStats)}
              />
            ))}
          </div>
        </section>
      )}

      <FeatureRoadmap />

      <details className="methodology-details panel-inset mt-10 px-5 py-4">
        <summary>How we calculate these numbers</summary>
        <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-600">
          <li>
            <span className="font-medium text-zinc-800">Whistle premium</span>{" "}
            — crew avg combined score minus league baseline ({refStats.meta.leagueAvgTotal}).
            A +4.5 premium means this crew&apos;s games historically run 4.5 points
            hotter than league average. Compared to sportsbook total when{" "}
            <code className="text-xs">ODDS_API_KEY</code> is set.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Pace alerts</span> —
            fire when premium ≥ +4 and gap vs benchmark ≥ +3 (or inverse for
            low pace), only with adequate ref sample size.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Home bias</span> —
            home vs away win rate under this crew across the dataset. Not ATS —
            spread ROI requires a closing-line feed we don&apos;t have yet.
          </li>
          <li>
            <span className="font-medium text-zinc-800">Grudge match flags</span>{" "}
            — ref–team anomalies for teams playing tonight (win rate, fouls,
            crew reunion).
          </li>
        </ul>
      </details>
    </div>
  );
}
