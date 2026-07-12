import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { FindingsSection } from "@/components/FindingsSection";
import { GameSlateCard } from "@/components/GameSlateCard";
import { JsonLd } from "@/components/JsonLd";
import { LeagueSlateHero } from "@/components/LeagueSlateHero";
import { OffseasonSlateNotice } from "@/components/OffseasonSlateNotice";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { SlateShareBar } from "@/components/SlateShareBar";
import { TrustCharterSummary } from "@/components/TrustCharterSummary";
import {
  computeCrewMetrics,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/laliga/data";
import { computeCrewHomeBias, computeSlateHomeBias } from "@/lib/laliga/home-bias";
import { getOdds } from "@/lib/laliga/odds";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
} from "@/lib/laliga/whistle-premium";
import { computeFindings } from "@/lib/laliga/findings";
import { resolveSlateGames, computeGameStorylines } from "@/lib/grudge-match";
import type { AssignmentGame } from "@/lib/types";
import {
  buildLaligaNightlyFeed,
  buildShareText,
  slateDatasetJsonLd,
  slateMetadataDescription,
  slateSportsEvents,
  topShareSignals,
} from "@/lib/syndication";
import { slatePageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import {
  NO_SIGNAL_SLATE_COPY,
  TONIGHT_SIGNALS_TITLE,
} from "@/lib/trust-charter";
import { EplAnalyticsLeaders } from "@/components/EplAnalyticsLeaders";
import { buildLaligaAnalyticsLeaders } from "@/lib/laliga/analytics-leaders";
import { TonightEdgeSummary } from "@/components/TonightEdgeSummary";
import { buildTonightEdgeSummary } from "@/lib/edge-summary";

export async function generateMetadata(): Promise<Metadata> {
  const assignments = getAssignments();
  const feed = buildLaligaNightlyFeed();
  const isOffseason = assignments.games.length === 0;
  const description = isOffseason
    ? "La Liga referee analytics during the offseason, dataset findings, ref profiles, and club histories."
    : slateMetadataDescription(feed);
  const title = isOffseason ? "La Liga ref data (offseason)" : "Tonight's La Liga matchday";
  return slatePageMetadata({
    title,
    description,
    path: "/laliga",
    keywords: ["La Liga referees","La Liga matchday","referee analytics"],
  });
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

export default async function LaligaHomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();
  const odds = getOdds();
  const findings = computeFindings(6, undefined, { hub: true });
  const isOffseason = assignments.games.length === 0;
  const { games: slateGames } = resolveSlateGames(assignments);
  const sortedGames = sortSlateGames(slateGames, refStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const nightlyFeed = buildLaligaNightlyFeed();
  const analyticsLeaders = buildLaligaAnalyticsLeaders(refStats);
  const hasRefData = refStats.refs.length > 0;

  const edgeItems = buildTonightEdgeSummary({
    sport: "laliga",
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
            name: isOffseason ? "La Liga ref data (offseason)" : "Tonight's La Liga matchday",
            description: slateMetadataDescription(nightlyFeed),
            url: absoluteUrl("/laliga"),
            dateModified: assignments.lastUpdated,
          },
          slateDatasetJsonLd(nightlyFeed),
          ...slateSportsEvents("LALIGA"),
        ]}
      />
      <LeagueSlateHero
        leagueId="laliga"
        assignments={assignments}
        refStats={refStats}
      />

      {isOffseason && <OffseasonSlateNotice league="LALIGA" />}

      {hasRefData ? (
        <>
          <FindingsSection
            findings={findings}
            featured
            slateHero
            initialVisibleCount={4}
            title={isOffseason ? "Season highlights" : "Officiating intelligence"}
            league="LALIGA"
            sortExplainer="Strong-confidence patterns first; thin samples sink to the bottom. Within each tier, ranked by effect size and sample depth."
          />

          <EplAnalyticsLeaders leaders={analyticsLeaders} hrefPrefix="/laliga" />
        </>
      ) : null}

      <section className="slate-quick-links">
        <BrowseActionCards league="LALIGA" compact />
      </section>

      {!isOffseason && (
        <>
          <SlateShareBar
            shareText={buildShareText(nightlyFeed)}
            topSignals={topShareSignals(nightlyFeed, 5)}
            disclaimer={nightlyFeed.disclaimer}
            pageUrl={nightlyFeed.pageUrl}
            league="LALIGA"
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
                  sport="laliga"
                  basePath="/laliga"
                  storylines={computeGameStorylines(game, refStats, 1)}
                  overBenchmark={refStats.meta.leagueOverBaseline}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <TrustCharterSummary />

      <ProComingSoonTease league="LALIGA" />
    </div>
  );
}
