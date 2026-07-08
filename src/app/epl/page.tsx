import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { FindingsSection } from "@/components/FindingsSection";
import { GameSlateCard } from "@/components/GameSlateCard";
import { JsonLd } from "@/components/JsonLd";
import { LeagueSlateHero } from "@/components/LeagueSlateHero";
import { LeagueDataSourceBanner } from "@/components/LeagueDataSourceBanner";
import { OffseasonSlateNotice } from "@/components/OffseasonSlateNotice";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { SlateShareBar } from "@/components/SlateShareBar";
import { TrustCharterSummary } from "@/components/TrustCharterSummary";
import {
  computeCrewMetrics,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/epl/data";
import { computeCrewHomeBias, computeSlateHomeBias } from "@/lib/epl/home-bias";
import { getOdds } from "@/lib/epl/odds";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
} from "@/lib/epl/whistle-premium";
import { computeFindings } from "@/lib/epl/findings";
import { resolveSlateGames, computeGameStorylines } from "@/lib/grudge-match";
import type { AssignmentGame } from "@/lib/types";
import {
  buildEplNightlyFeed,
  buildShareText,
  slateDatasetJsonLd,
  slateMetadataDescription,
  slateSportsEvents,
  topShareSignals,
} from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";
import {
  NO_SIGNAL_SLATE_COPY,
  TONIGHT_SIGNALS_TITLE,
} from "@/lib/trust-charter";
import { EplPreviewBanner } from "@/components/EplPreviewBanner";
import { EplAnalyticsLeaders } from "@/components/EplAnalyticsLeaders";
import { buildEplAnalyticsLeaders } from "@/lib/epl/analytics-leaders";
import { TonightEdgeSummary } from "@/components/TonightEdgeSummary";
import { buildTonightEdgeSummary } from "@/lib/edge-summary";

export async function generateMetadata(): Promise<Metadata> {
  const assignments = getAssignments();
  const feed = buildEplNightlyFeed();
  const isOffseason = assignments.games.length === 0;
  const description = isOffseason
    ? "EPL referee analytics during the offseason, dataset findings, ref profiles, and club histories."
    : slateMetadataDescription(feed);
  const title = isOffseason ? "EPL ref data (offseason)" : "Tonight's EPL matchday";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/epl") },
    openGraph: {
      title: `${title} | Ref Watch`,
      description,
      url: absoluteUrl("/epl"),
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

export default function EplHomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();
  const odds = getOdds();
  const findings = computeFindings();
  const isOffseason = assignments.games.length === 0;
  const { games: slateGames } = resolveSlateGames(assignments);
  const sortedGames = sortSlateGames(slateGames, refStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const nightlyFeed = buildEplNightlyFeed();
  const analyticsLeaders = buildEplAnalyticsLeaders(refStats);

  const edgeItems = buildTonightEdgeSummary({
    sport: "epl",
    alertPremiums: premiums.filter((p) => p.alert !== null),
    allPremiums: premiums,
    homeBiasSignals,
    ppPremiums: [],
    otSignals: [],
  });

  return (
    <div className="page-shell page-shell-slate">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: isOffseason ? "EPL ref data (offseason)" : "Tonight's EPL matchday",
            description: slateMetadataDescription(nightlyFeed),
            url: absoluteUrl("/epl"),
            dateModified: assignments.lastUpdated,
          },
          slateDatasetJsonLd(nightlyFeed),
          ...slateSportsEvents("EPL"),
        ]}
      />
      <LeagueSlateHero
        leagueId="epl"
        assignments={assignments}
        refStats={refStats}
      />

      <LeagueDataSourceBanner league="epl" meta={refStats.meta} className="mt-4" />

      <EplPreviewBanner
        statsSource={refStats.meta.source}
        assignmentsSource={assignments.source}
      />

      {isOffseason && <OffseasonSlateNotice league="EPL" />}

      <FindingsSection
        findings={findings}
        featured
        slateHero
        initialVisibleCount={4}
        title={isOffseason ? "Season highlights" : "Officiating intelligence"}
        league="EPL"
        sortExplainer="Strong-confidence patterns first; thin samples sink to the bottom. Within each tier, ranked by effect size and sample depth."
      />

      <EplAnalyticsLeaders leaders={analyticsLeaders} />

      <section className="slate-quick-links">
        <BrowseActionCards league="EPL" compact />
      </section>

      {!isOffseason && (
        <>
          <SlateShareBar
            shareText={buildShareText(nightlyFeed)}
            topSignals={topShareSignals(nightlyFeed, 5)}
            disclaimer={nightlyFeed.disclaimer}
            pageUrl={nightlyFeed.pageUrl}
            league="EPL"
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
            <p className="mt-1 text-sm text-zinc-600">
              {assignments.source === "espn"
                ? "Crew assignments from ESPN game summaries."
                : "No verified crew assignments published for this date yet."}
            </p>
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
                  sport="epl"
                  basePath="/epl"
                  storylines={computeGameStorylines(game, refStats, 1)}
                  overBenchmark={refStats.meta.leagueOverBaseline}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <TrustCharterSummary />

      <ProComingSoonTease league="EPL" />
    </div>
  );
}
