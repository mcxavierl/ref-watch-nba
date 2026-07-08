import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { CbbPreviewBanner } from "@/components/CbbPreviewBanner";
import { FindingsSection } from "@/components/FindingsSection";
import { JsonLd } from "@/components/JsonLd";
import { LeagueSlateHero } from "@/components/LeagueSlateHero";
import { OffseasonSlateNotice } from "@/components/OffseasonSlateNotice";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { SlateShareBar } from "@/components/SlateShareBar";
import { TrustCharterSummary } from "@/components/TrustCharterSummary";
import { GameSlateCard } from "@/components/GameSlateCard";
import { TonightEdgeSummary } from "@/components/TonightEdgeSummary";
import {
  computeCrewMetrics,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/cbb/data";
import { buildTonightEdgeSummary } from "@/lib/edge-summary";
import { computeFindings } from "@/lib/cbb/findings";
import {
  computeGameStorylines,
  computeSlateStorylines,
  resolveSlateGames,
} from "@/lib/grudge-match";
import { computeCrewHomeBias, computeSlateHomeBias } from "@/lib/cbb/home-bias";
import { getOdds } from "@/lib/cbb/odds";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
  paceAlerts,
} from "@/lib/cbb/whistle-premium";
import type { AssignmentGame } from "@/lib/types";
import {
  buildCbbNightlyFeed,
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

export async function generateMetadata(): Promise<Metadata> {
  const assignments = getAssignments();
  const feed = buildCbbNightlyFeed();
  const isOffseason = assignments.games.length === 0;
  const description = isOffseason
    ? "CBB ref and crew analytics during the offseason, dataset findings, ref profiles, and team histories."
    : slateMetadataDescription(feed);
  const title = isOffseason ? "CBB ref data (offseason)" : "Tonight's CBB slate";
  return slatePageMetadata({
    title,
    description,
    path: "/cbb",
    keywords: ["CBB referees","college basketball refs"],
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
  const nightlyFeed = buildCbbNightlyFeed();

  const edgeItems = buildTonightEdgeSummary({
        sport: "cbb",
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
            name: isOffseason ? "CBB ref data (offseason)" : "Tonight's CBB slate",
            description: slateMetadataDescription(nightlyFeed),
            url: absoluteUrl("/cbb"),
            dateModified: assignments.lastUpdated,
          },
          slateDatasetJsonLd(nightlyFeed),
          ...slateSportsEvents("CBB"),
        ]}
      />
      <LeagueSlateHero
        leagueId="cbb"
        assignments={assignments}
        refStats={refStats}
      />

      <CbbPreviewBanner
        statsSource={refStats.meta.source}
        assignmentsSource={assignments.source}
      />

      {isOffseason && <OffseasonSlateNotice league="CBB" />}

      <FindingsSection
        findings={findings}
        featured
        slateHero
        initialVisibleCount={4}
        title={isOffseason ? "Season highlights" : "Officiating intelligence"}
        league="CBB"
        sortExplainer="Strong-confidence patterns first; thin samples sink to the bottom. Within each tier, ranked by effect size and sample depth."
      />

      <section className="slate-quick-links">
        <BrowseActionCards league="CBB" compact />
      </section>

      {!isOffseason && (
        <>
          <SlateShareBar
            shareText={buildShareText(nightlyFeed)}
            topSignals={topShareSignals(nightlyFeed, 5)}
            disclaimer={nightlyFeed.disclaimer}
            pageUrl={nightlyFeed.pageUrl}
            league="CBB"
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
                  sport="cbb"
                  basePath="/cbb"
                  storylines={computeGameStorylines(game, refStats, 1)}
                  overBenchmark={refStats.meta.leagueOverBaseline}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <TrustCharterSummary />

      <ProComingSoonTease league="CBB" />
    </div>
  );
}
