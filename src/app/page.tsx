import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { FindingsSection } from "@/components/FindingsSection";
import { JsonLd } from "@/components/JsonLd";
import { LeagueSlateHero } from "@/components/LeagueSlateHero";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { SlateFeatureShowcase } from "@/components/SlateFeatureShowcase";
import { SlateQuickLookupSection } from "@/components/SlateQuickLookupSection";
import { SlateShareBar } from "@/components/SlateShareBar";
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
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import { readSeasonScopeParam } from "@/lib/season-scope";
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
import { slatePageMetadata } from "@/lib/seo";
import {
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
  return slatePageMetadata({
    title,
    description,
    path: "/",
    keywords: ["NBA refs", "NBA referee crew", "tonight's NBA slate", "referee analytics"],
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;
  const scopeMode = readSeasonScopeParam(scope);
  const scoped = loadScopedLeagueStats("nba", scopeMode);
  const assignments = getAssignments();
  const refStats = getRefStats();
  const odds = getOdds();
  const findings = computeFindings(6, scoped.scopedSeasons);
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
      <LeagueSlateHero
        leagueId="nba"
        assignments={assignments}
        refStats={scoped.stats}
        productHome={isOffseason}
        showScopeToggle={isOffseason}
        scopeLabel={scoped.scopeLabel}
      />

      {isOffseason && <SlateQuickLookupSection />}

      {isOffseason && <SlateFeatureShowcase />}

      <FindingsSection
        findings={findings}
        featured
        slateHero
        initialVisibleCount={4}
        title={isOffseason ? "Season highlights" : "Officiating intelligence"}
        league="NBA"
        showScopeToggle
        scopeLabel={`${scoped.scopeLabel} · ${scoped.formatRange(scoped.stats.meta)}`}
        sortExplainer="Strong-confidence patterns first; thin samples sink to the bottom. Within each tier, ranked by effect size and sample depth."
      />

      {!isOffseason && (
        <section className="slate-quick-links">
          <BrowseActionCards league="NBA" compact />
        </section>
      )}

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

      <TrustCharterSummary />

      <ProComingSoonTease league="NBA" />
    </div>
  );
}
