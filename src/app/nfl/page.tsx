import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { FindingsSection } from "@/components/FindingsSection";
import { GameSlateCard } from "@/components/GameSlateCard";
import { JsonLd } from "@/components/JsonLd";
import { LeagueSlateHero } from "@/components/LeagueSlateHero";
import { LeagueHubUpcomingSlateSection } from "@/components/LeagueHubUpcomingSlateSection";
import { OffseasonSlateNotice } from "@/components/OffseasonSlateNotice";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { RelatedInsightsFooter } from "@/components/RelatedInsightsFooter";
import { SlateShareBar } from "@/components/SlateShareBar";
import { TrustCharterSummary } from "@/components/TrustCharterSummary";
import {
  computeCrewMetrics,
  getAssignments,
  getRefStats,
  ouLeanSortWeight,
} from "@/lib/nfl/data";
import { computeCrewHomeBias, computeSlateHomeBias } from "@/lib/nfl/home-bias";
import { getOdds } from "@/lib/nfl/odds";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
} from "@/lib/nfl/whistle-premium";
import { computeFindings } from "@/lib/nfl/findings";
import { resolveSlateGames, computeGameStorylines } from "@/lib/grudge-match";
import type { AssignmentGame } from "@/lib/types";
import {
  buildNflNightlyFeed,
  buildShareText,
  buildLeagueSlateJsonLd,
  slateMetadataDescription,
  topShareSignals,
} from "@/lib/syndication";
import { generateLeagueSlateMetadata, leagueSlatePageTitle } from "@/lib/seo";
import { isOffseasonSlate, isPendingCrewSlate, upcomingMatchups } from "@/lib/offseason";
import { UpcomingSlateNotice } from "@/components/UpcomingSlateNotice";
import { buildLeagueUpcomingSlateFromAssignments } from "@/lib/overview-upcoming-slate";
import {
  FINDINGS_SORT_EXPLAINER,
  NO_SIGNAL_SLATE_COPY,
  TONIGHT_SIGNALS_TITLE,
} from "@/lib/trust-charter";
import { NflAnalyticsLeaders } from "@/components/NflAnalyticsLeaders";
import { buildNflAnalyticsLeaders } from "@/lib/nfl/analytics-leaders";
import { SuperBowlOfficiatingSection } from "@/components/SuperBowlOfficiatingSection";
import { TonightEdgeSummary } from "@/components/TonightEdgeSummary";
import { buildTonightEdgeSummary } from "@/lib/edge-summary";

export async function generateMetadata(): Promise<Metadata> {
  const assignments = getAssignments();
  const feed = buildNflNightlyFeed();
  const isOffseason = isOffseasonSlate(assignments);
  const isPending = isPendingCrewSlate(assignments);
  return generateLeagueSlateMetadata("nfl", {
    isOffseason,
    isPending,
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

export default async function NflHomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();
  const odds = getOdds();
  const findings = computeFindings(6, undefined, { hub: true });
  const isOffseason = isOffseasonSlate(assignments);
  const isPending = isPendingCrewSlate(assignments);
  const pendingMatchups = upcomingMatchups(assignments).map((game) => game.matchup);
  const upcomingSlate = buildLeagueUpcomingSlateFromAssignments("nfl", assignments);
  const { games: slateGames, isPreview: slateIsPreview } = resolveSlateGames(assignments);
  const sortedGames = sortSlateGames(slateGames, refStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const nightlyFeed = buildNflNightlyFeed();
  const analyticsLeaders = buildNflAnalyticsLeaders(refStats);

  const edgeItems = buildTonightEdgeSummary({
    sport: "nfl",
    alertPremiums: premiums.filter((p) => p.alert !== null),
    allPremiums: premiums,
    homeBiasSignals,
    ppPremiums: [],
    otSignals: [],
  });

  return (
    <div className="page-shell page-shell-slate">
      <JsonLd
        data={buildLeagueSlateJsonLd(
          leagueSlatePageTitle("nfl", { isOffseason, isPending }),
          nightlyFeed,
          assignments.lastUpdated,
        )}
      />
      <LeagueSlateHero
        leagueId="nfl"
        assignments={assignments}
        refStats={refStats}
      />

      <LeagueHubUpcomingSlateSection slate={upcomingSlate} leagueLabel="NFL" />

      {isPending && (
        <UpcomingSlateNotice
          league="NFL"
          note={assignments.note}
          matchups={pendingMatchups}
          slateDate={assignments.nextSlateDate ?? assignments.date}
        />
      )}

      {isOffseason && <OffseasonSlateNotice league="NFL" />}

      <FindingsSection
        findings={findings}
        featured
        slateHero
        initialVisibleCount={4}
        title={isOffseason ? "Season highlights" : "Officiating intelligence"}
        league="NFL"
        sortExplainer={FINDINGS_SORT_EXPLAINER}
      />

      <SuperBowlOfficiatingSection variant="home" limit={4} />

      <NflAnalyticsLeaders leaders={analyticsLeaders} />

      <section className="slate-quick-links">
        <BrowseActionCards league="NFL" compact />
      </section>

      {!isOffseason && (
        <>
          <SlateShareBar
            shareText={buildShareText(nightlyFeed)}
            topSignals={topShareSignals(nightlyFeed, 5)}
            disclaimer={nightlyFeed.disclaimer}
            pageUrl={nightlyFeed.pageUrl}
            league="NFL"
          />

          <TonightEdgeSummary
            items={edgeItems}
            title={TONIGHT_SIGNALS_TITLE}
            emptyMessage={NO_SIGNAL_SLATE_COPY}
          />

          <section className="section-block">
            <h2 className="section-title">
              {slateIsPreview
                ? slateGames.length === 1
                  ? "Upcoming game"
                  : "Upcoming games"
                : slateGames.length === 1
                  ? "Tonight's game"
                  : "Tonight's games"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {slateIsPreview
                ? `Matchups on the ${new Date(`${assignments.nextSlateDate ?? assignments.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} slate. Crew assignments publish closer to kickoff.`
                : assignments.source === "espn"
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
                  sport="nfl"
                  basePath="/nfl"
                  storylines={computeGameStorylines(game, refStats, 1)}
                  overBenchmark={refStats.meta.leagueOverBaseline}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <TrustCharterSummary />

      <RelatedInsightsFooter league="NFL" />

      <ProComingSoonTease league="NFL" />
    </div>
  );
}
