import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
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
} from "@/lib/nhl/data";
import { buildTonightEdgeSummary } from "@/lib/edge-summary";
import { computeFindings } from "@/lib/nhl/findings";
import { resolveSlateGames, computeGameStorylines } from "@/lib/grudge-match";
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
import {
  buildNhlNightlyFeed,
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
  const feed = buildNhlNightlyFeed();
  const isOffseason = assignments.games.length === 0;
  return generateLeagueSlateMetadata("nhl", {
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

export default async function NhlHomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();
  const odds = getOdds();
  const findings = computeFindings(6, undefined, { hub: true });
  const isOffseason = assignments.games.length === 0;
  const upcomingSlate = buildLeagueUpcomingSlateFromAssignments("nhl", assignments);
  const { games: slateGames } = resolveSlateGames(assignments);
  const sortedGames = sortSlateGames(slateGames, refStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const alertPremiums = paceAlerts(premiums);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const ppPremiums = computeSlatePpPremiums(sortedGames, refStats, odds);
  const otSignals = computeSlateOtSignals(sortedGames, refStats, odds);

  const ppByGame = new Map(ppPremiums.map((p) => [p.gameId, p]));
  const otByGame = new Map(otSignals.map((p) => [p.gameId, p]));
  const nightlyFeed = buildNhlNightlyFeed();

  const edgeItems = buildTonightEdgeSummary({
        sport: "nhl",
        alertPremiums,
        allPremiums: premiums,
        homeBiasSignals,
        ppPremiums,
        otSignals,
      });

  return (
    <div className="page-shell page-shell-slate">
      <JsonLd
        data={buildLeagueSlateJsonLd(
          leagueSlatePageTitle("nhl", { isOffseason }),
          nightlyFeed,
          assignments.lastUpdated,
        )}
      />
      <LeagueSlateHero
        leagueId="nhl"
        assignments={assignments}
        refStats={refStats}
      />

      <LeagueHubUpcomingSlateSection slate={upcomingSlate} leagueLabel="NHL" />

      {isOffseason && <OffseasonSlateNotice league="NHL" />}

      <FindingsSection
        findings={findings}
        featured
        slateHero
        initialVisibleCount={4}
        title={isOffseason ? "Season highlights" : "Officiating intelligence"}
        league="NHL"
        sortExplainer={FINDINGS_SORT_EXPLAINER}
      />

      <section className="slate-quick-links">
        <BrowseActionCards league="NHL" compact />
      </section>

      {!isOffseason && (
        <>
          <SlateShareBar
            shareText={buildShareText(nightlyFeed)}
            topSignals={topShareSignals(nightlyFeed, 5)}
            disclaimer={nightlyFeed.disclaimer}
            pageUrl={nightlyFeed.pageUrl}
            league="NHL"
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
                  ppPremium={ppByGame.get(game.id) ?? null}
                  otSignal={otByGame.get(game.id) ?? null}
                  sport="nhl"
                  basePath="/nhl"
                  storylines={computeGameStorylines(game, refStats, 1)}
                  overBenchmark={refStats.meta.leagueOverBaseline}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <TrustCharterSummary />

      <RelatedInsightsFooter league="NHL" />

    </div>
  );
}
