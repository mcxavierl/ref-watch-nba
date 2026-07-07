import type { Metadata } from "next";
import Link from "next/link";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { DataConfidenceSummary } from "@/components/DataConfidenceSummary";
import { FindingsSection } from "@/components/FindingsSection";
import { JsonLd } from "@/components/JsonLd";
import { SlateShareBar } from "@/components/SlateShareBar";
import { TermHelp } from "@/components/TermHelp";
import { GameSlateCard } from "@/components/GameSlateCard";
import {
  computeCrewMetrics,
  formatSigned,
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
import { collectSlateProvenance } from "@/lib/provenance";
import { getOdds } from "@/lib/odds";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
  paceAlerts,
} from "@/lib/whistle-premium";
import type { AssignmentGame } from "@/lib/types";
import {
  buildNbaNightlyFeed,
  buildShareText,
  slateDatasetJsonLd,
  slateMetadataDescription,
  slateSportsEvents,
  topShareSignals,
} from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const feed = buildNbaNightlyFeed();
  const description = slateMetadataDescription(feed);
  return {
    title: "Tonight's NBA slate",
    description,
    alternates: {
      canonical: absoluteUrl("/"),
    },
    openGraph: {
      title: "Tonight's NBA slate — Ref Watch",
      description,
      url: absoluteUrl("/"),
      type: "website",
    },
  };
}

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
  const slateStorylines = computeSlateStorylines(sortedGames, refStats, 5);
  const metricsList = sortedGames.map((game) =>
    computeCrewMetrics(game.crew, refStats),
  );
  const confidenceSummary = collectSlateProvenance(
    metricsList,
    premiums,
    homeBiasSignals,
  );
  const nightlyFeed = buildNbaNightlyFeed();

  return (
    <div className="page-shell">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Tonight's NBA slate",
            description: slateMetadataDescription(nightlyFeed),
            url: absoluteUrl("/"),
            dateModified: assignments.lastUpdated,
          },
          slateDatasetJsonLd(nightlyFeed),
          ...slateSportsEvents("NBA"),
        ]}
      />
      <section className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Tonight&apos;s slate
        </h1>
        <p className="page-lead">
          Official crew assignments cross-checked against historical scoring,
          fouls, ATS splits, and ref–team history.
        </p>
        <DataFreshnessMeta assignments={assignments} refStats={refStats} />
        {slateGames.length > 0 && (
          <div className="mt-4">
            <DataConfidenceSummary summary={confidenceSummary} />
          </div>
        )}
      </section>

      {slateGames.length === 0 ? (
        <div className="panel-inset px-6 py-10 text-center">
          <p className="text-base font-medium text-zinc-800">
            No NBA games scheduled tonight
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            Run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-border">
              npm run morning-slate
            </code>{" "}
            before tip-off.
          </p>
          <p className="mt-5">
            <Link
              href="/teams"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
            >
              Browse team crew histories →
            </Link>
          </p>
        </div>
      ) : (
        <>
          <SlateShareBar
            shareText={buildShareText(nightlyFeed)}
            topSignals={topShareSignals(nightlyFeed, 5)}
            disclaimer={nightlyFeed.disclaimer}
            pageUrl={nightlyFeed.pageUrl}
            league="NBA"
          />

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
              <TermHelp id="whistle-premium" /> and{" "}
              <TermHelp id="grudge-match" /> — tap terms for definitions.
            </p>
            <div className="mt-4 space-y-4 text-sm">
              {alertPremiums.length === 0 && slateStorylines.length === 0 && (
                <p className="text-zinc-600">
                  No high-signal pace alerts or grudge flags for this slate.
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
                    <TermHelp id="whistle-premium">scoring premium</TermHelp>,{" "}
                    {formatSigned(p.gapVsBenchmark)}{" "}
                    <TermHelp id="line-gap">line gap</TermHelp> vs{" "}
                    {p.benchmarkSource === "sportsbook"
                      ? "book"
                      : String(refStats.meta.leagueOverBaseline)}.
                  </p>
                </div>
              ))}
              {slateStorylines.slice(0, 3).map((s) => (
                <div key={s.id} className="border-l-2 border-zinc-200 pl-3">
                  <p className="font-medium text-zinc-900">{s.headline}</p>
                  <p className="mt-1 text-zinc-600">{s.summary}</p>
                </div>
              ))}
              {homeBiasSignals.slice(0, 2).map((b) => (
                <div key={b.gameId} className="border-l-2 border-zinc-200 pl-3">
                  <p className="font-medium text-zinc-900">{b.headline}</p>
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
                  storylines={computeGameStorylines(game, refStats, 1)}
                  overBenchmark={refStats.meta.leagueOverBaseline}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <details className="panel-inset mb-8 px-4 py-3 sm:px-5">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
          Dataset findings
        </summary>
        <div className="mt-4">
          <FindingsSection findings={findings} compact />
        </div>
      </details>

      <details className="methodology-details panel-inset px-4 py-3 sm:px-5">
        <summary>Methodology</summary>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
          <li>
            <TermHelp id="whistle-premium" /> — crew avg combined score minus
            league baseline ({refStats.meta.leagueAvgTotal}).
          </li>
          <li>
            <TermHelp id="pace-alert" /> — sample-gated; compares crew history
            to tonight&apos;s line.
          </li>
          <li>
            Ref <TermHelp id="ats" /> and <TermHelp id="over-under" /> on profile
            pages use <TermHelp id="closing-line">closing lines</TermHelp>.
          </li>
          <li>
            <TermHelp id="grudge-match" /> — ref–team anomalies for teams on
            tonight&apos;s card.
          </li>
        </ul>
      </details>
    </div>
  );
}
