import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { FindingsSection } from "@/components/FindingsSection";
import { JsonLd } from "@/components/JsonLd";
import { OffseasonSlateNotice } from "@/components/OffseasonSlateNotice";
import { MethodologyAccordion } from "@/components/MethodologyAccordion";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { SlateShareBar } from "@/components/SlateShareBar";
import { TermHelp } from "@/components/TermHelp";
import { TrustCharterSummary } from "@/components/TrustCharterSummary";
import { GameSlateCard } from "@/components/GameSlateCard";
import { TonightEdgeSummary } from "@/components/TonightEdgeSummary";
import {
  computeCrewMetrics,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/data";
import { buildTonightEdgeSummary } from "@/lib/edge-summary";
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
import {
  buildNbaNightlyFeed,
  buildShareText,
  slateDatasetJsonLd,
  slateMetadataDescription,
  slateSportsEvents,
  topShareSignals,
} from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";
import {
  REFWATCH_HERO_SUPPORTING,
  REFWATCH_MISSION,
  NO_SIGNAL_SLATE_COPY,
  TONIGHT_SIGNALS_TITLE,
} from "@/lib/trust-charter";

export async function generateMetadata(): Promise<Metadata> {
  const assignments = getAssignments();
  const feed = buildNbaNightlyFeed();
  const isOffseason = assignments.games.length === 0;
  const description = isOffseason
    ? "NBA ref and crew analytics during the offseason, dataset findings, ref profiles, and team histories."
    : slateMetadataDescription(feed);
  const title = isOffseason ? "NBA ref data (offseason)" : "Tonight's NBA slate";
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl("/"),
    },
    openGraph: {
      title: `${title} | Ref Watch`,
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
  const isOffseason = assignments.games.length === 0;
  const { games: slateGames } = resolveSlateGames(assignments);
  const sortedGames = sortSlateGames(slateGames, refStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const alertPremiums = paceAlerts(premiums);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const slateStorylines = computeSlateStorylines(sortedGames, refStats, 5);
  const nightlyFeed = buildNbaNightlyFeed();

  const edgeItems = buildTonightEdgeSummary({
        sport: "nba",
        alertPremiums,
        allPremiums: premiums,
        homeBiasSignals,
        storylines: slateStorylines,
      });

  return (
    <div className="page-shell page-shell-slate">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: isOffseason ? "NBA ref data (offseason)" : "Tonight's NBA slate",
            description: slateMetadataDescription(nightlyFeed),
            url: absoluteUrl("/"),
            dateModified: assignments.lastUpdated,
          },
          slateDatasetJsonLd(nightlyFeed),
          ...slateSportsEvents("NBA"),
        ]}
      />
      <section className="page-hero page-hero-slate">
        <h1 className="page-title">
          {isOffseason ? "NBA officiating intelligence" : REFWATCH_MISSION}
        </h1>
        <p className="page-lead">
          {isOffseason
            ? "Historical crew patterns, ref profiles, and team histories while the slate is paused."
            : REFWATCH_HERO_SUPPORTING}
        </p>
        <DataFreshnessMeta assignments={assignments} refStats={refStats} />
      </section>

      {isOffseason && <OffseasonSlateNotice league="NBA" />}

      <FindingsSection
        findings={findings}
        featured
        slateHero
        initialVisibleCount={4}
        title={isOffseason ? "Season highlights" : "Officiating intelligence"}
        league="NBA"
        sortExplainer="Ranked by effect size and sample depth. Standout ref×team splits and large whistle swings rise to the top; weak league-wide noise is filtered out."
      />

      <section className="slate-quick-links">
        <BrowseActionCards league="NBA" compact />
      </section>

      {!isOffseason && (
        <>
          <SlateShareBar
            shareText={buildShareText(nightlyFeed)}
            topSignals={topShareSignals(nightlyFeed, 5)}
            disclaimer={nightlyFeed.disclaimer}
            pageUrl={nightlyFeed.pageUrl}
            league="NBA"
          />

          <TonightEdgeSummary
            items={edgeItems}
            title={TONIGHT_SIGNALS_TITLE}
            emptyMessage={NO_SIGNAL_SLATE_COPY}
          />

          <section className="section-block">
            <h2 className="section-title">
              {slateGames.length === 1 ? "Tonight's game" : "Tonight's games"}
            </h2>
            <div className="slate-stack mt-4">
              {sortedGames.map((game, index) => (
                <GameSlateCard
                  key={game.id}
                  slateIndex={index}
                  gameId={game.id}
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

      <TrustCharterSummary compact />

      <MethodologyAccordion>
        <ul className="space-y-2 text-sm leading-relaxed text-zinc-600">
          <li>
            Findings ranked by effect size × √sample size, with sample gates
            (30+ ref games, 8+ team splits, 30+ ATS decisions).
          </li>
          <li>
            <TermHelp id="whistle-premium" />: crew avg combined score minus
            league baseline ({refStats.meta.leagueAvgTotal}).
          </li>
          <li>
            Ref <TermHelp id="ats" /> and <TermHelp id="over-under" /> use{" "}
            <TermHelp id="closing-line">closing lines</TermHelp> where available.
            When unavailable, we use a fixed league benchmark (
            {refStats.meta.leagueOverBaseline}) as a historical over rate proxy.
          </li>
          <li>
            Seasons covered: {refStats.meta.seasons.join(", ")} (
            {refStats.meta.totalGamesProcessed?.toLocaleString() ?? "-"} games).
          </li>
          <li>
            <ProComingSoonTease league="NBA" compact />
          </li>
        </ul>
      </MethodologyAccordion>

      <ProComingSoonTease league="NBA" />
    </div>
  );
}
