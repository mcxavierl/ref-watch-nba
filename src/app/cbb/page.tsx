import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { ConferenceCoverage } from "@/components/ConferenceCoverage";
import { FindingsSection } from "@/components/FindingsSection";
import { JsonLd } from "@/components/JsonLd";
import { LeagueSlateHero } from "@/components/LeagueSlateHero";
import { LeagueHubUpcomingSlateSection } from "@/components/LeagueHubUpcomingSlateSection";
import { OffseasonSlateNotice } from "@/components/OffseasonSlateNotice";
import { RelatedInsightsFooter } from "@/components/RelatedInsightsFooter";
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
  buildLeagueSlateJsonLd,
  slateMetadataDescription,
  topShareSignals,
} from "@/lib/syndication";
import { generateLeagueSlateMetadata, leagueSlatePageTitle } from "@/lib/seo";
import {
  FINDINGS_SORT_EXPLAINER,
  NO_SIGNAL_SLATE_COPY,
  TONIGHT_SIGNALS_TITLE,
} from "@/lib/trust-charter";
import { buildLeagueUpcomingSlateFromAssignments } from "@/lib/overview-upcoming-slate";

export async function generateMetadata(): Promise<Metadata> {
  const assignments = getAssignments();
  const feed = buildCbbNightlyFeed();
  const isOffseason = assignments.games.length === 0;
  return generateLeagueSlateMetadata("cbb", {
    isOffseason,
    slateDescription: isOffseason ? undefined : slateMetadataDescription(feed),
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
  const findings = computeFindings(6, undefined, { hub: true });
  const isOffseason = assignments.games.length === 0;
  const upcomingSlate = buildLeagueUpcomingSlateFromAssignments("cbb", assignments);
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
        data={buildLeagueSlateJsonLd(
          leagueSlatePageTitle("cbb", { isOffseason }),
          nightlyFeed,
          assignments.lastUpdated,
        )}
      />

      <LeagueSlateHero
        leagueId="cbb"
        assignments={assignments}
        refStats={refStats}
        productHome={isOffseason}
      />

      <LeagueHubUpcomingSlateSection slate={upcomingSlate} leagueLabel="CBB" />

      {isOffseason && <OffseasonSlateNotice league="CBB" />}

      <ConferenceCoverage leagueId="cbb" />

      <FindingsSection
        findings={findings}
        featured
        slateHero
        initialVisibleCount={4}
        title={isOffseason ? "Season highlights" : "Officiating intelligence"}
        league="CBB"
        sortExplainer={FINDINGS_SORT_EXPLAINER}
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

      <RelatedInsightsFooter league="CBB" />

    </div>
  );
}
