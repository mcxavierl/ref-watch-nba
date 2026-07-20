import { BrowseActionCards } from "@/components/BrowseActionCards";
import {
  ConferenceCoverage,
  readCbbTrendsConferenceParam,
} from "@/components/ConferenceCoverage";
import { CbbConferenceNavSection } from "@/components/cbb/CbbConferenceNavSection";
import { CbbResearchFeed } from "@/components/cbb/CbbResearchFeed";
import { CbbAnalyticsLeaders } from "@/components/CbbAnalyticsLeaders";
import { CbbConferenceHub } from "@/components/CbbConferenceHub";
import { GameSlateCard } from "@/components/GameSlateCard";
import { JsonLd } from "@/components/JsonLd";
import { LeagueHomeInsightSections } from "@/components/LeagueHomeInsightSections";
import { LeagueHubUpcomingSlateSection } from "@/components/LeagueHubUpcomingSlateSection";
import { LeagueSlateHero } from "@/components/LeagueSlateHero";
import { OffseasonSlateNotice } from "@/components/OffseasonSlateNotice";
import { RelatedInsightsFooter } from "@/components/RelatedInsightsFooter";
import { SlateFeatureShowcase } from "@/components/SlateFeatureShowcase";
import { SlateQuickLookupSection } from "@/components/SlateQuickLookupSection";
import { SlateShareBar } from "@/components/SlateShareBar";
import { SuperBowlOfficiatingSection } from "@/components/SuperBowlOfficiatingSection";
import { TonightEdgeSummary } from "@/components/TonightEdgeSummary";
import { TrustCharterSummary } from "@/components/TrustCharterSummary";
import { UpcomingSlateNotice } from "@/components/UpcomingSlateNotice";
import { EplAnalyticsLeaders } from "@/components/EplAnalyticsLeaders";
import { NflAnalyticsLeaders } from "@/components/NflAnalyticsLeaders";
import { CfbAnalyticsLeaders } from "@/components/CfbAnalyticsLeaders";
import { buildCbbConferenceTendenciesStats } from "@/lib/cbb/conference-tendencies";
import type { LiveNcaaConferenceId } from "@/lib/ncaa-conference-gate";
import { LEAGUE_MANIFEST, type LeagueManifestId } from "@/lib/league-manifest";
import { buildTonightEdgeSummary } from "@/lib/edge-summary";
import {
  computeCrewMetrics as computeNbaCrewMetrics,
  ouLeanSortWeight,
} from "@/lib/data";
import {
  computeCrewMetrics as computeWnbaCrewMetrics,
} from "@/lib/wnba/data";
import {
  computeGameStorylines,
  computeSlateStorylines,
  resolveSlateGames,
} from "@/lib/grudge-match";
import { computeCrewHomeBias, computeSlateHomeBias } from "@/lib/home-bias";
import { isSlateLeagueId, loadLeagueSlateBundle } from "@/lib/league-slate-data";
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import { upcomingMatchups } from "@/lib/offseason";
import { buildLeagueHubUpcomingSchedule } from "@/lib/overview-upcoming-slate";
import { readSeasonScopeParam } from "@/lib/season-scope";
import {
  buildShareText,
  buildLeagueSlateJsonLd,
  topShareSignals,
} from "@/lib/syndication";
import { leagueSlatePageTitle } from "@/lib/seo";
import { buildLeagueHomeInsights } from "@/lib/league-home-insights";
import {
  NO_SIGNAL_SLATE_COPY,
  TONIGHT_SIGNALS_TITLE,
} from "@/lib/trust-charter";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
  paceAlerts,
} from "@/lib/whistle-premium";
import type { AssignmentGame, RefStatsFile } from "@/lib/types";

function computeLeagueCrewMetrics(
  leagueId: LeagueManifestId,
  crew: AssignmentGame["crew"],
  refStats: RefStatsFile,
) {
  return leagueId === "wnba"
    ? computeWnbaCrewMetrics(crew, refStats)
    : computeNbaCrewMetrics(crew, refStats);
}

function sortSlateGames(
  leagueId: LeagueManifestId,
  games: AssignmentGame[],
  refStats: RefStatsFile,
) {
  return [...games].sort((a, b) => {
    const aMetrics = computeLeagueCrewMetrics(leagueId, a.crew, refStats);
    const bMetrics = computeLeagueCrewMetrics(leagueId, b.crew, refStats);
    const leanDiff =
      ouLeanSortWeight(bMetrics.ouLean) - ouLeanSortWeight(aMetrics.ouLean);
    if (leanDiff !== 0) return leanDiff;
    return a.matchup.localeCompare(b.matchup);
  });
}

type LeagueSlatePageProps = {
  leagueId: LeagueManifestId;
  searchParams: Promise<{ scope?: string; conference?: string }>;
};

function slateCardSport(
  leagueId: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba",
): "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba" {
  return leagueId;
}

export async function LeagueSlatePage({ leagueId, searchParams }: LeagueSlatePageProps) {
  if (!isSlateLeagueId(leagueId)) {
    throw new Error(`LeagueSlatePage does not support ${leagueId}`);
  }

  const entry = LEAGUE_MANIFEST[leagueId];
  const features = entry.slate;
  const { scope, conference: conferenceParam } = await searchParams;
  const scopeMode = readSeasonScopeParam(scope);
  const cbbConference =
    leagueId === "cbb" ? readCbbTrendsConferenceParam(conferenceParam) : "all";
  const scoped =
    features.seasonScopeOnSlate
      ? loadScopedLeagueStats(leagueId, scopeMode)
      : null;
  const bundle = loadLeagueSlateBundle(leagueId);
  const { assignments, refStats, odds, nightlyFeed, isOffseason, isPending } = bundle;
  const activeRefStats = scoped?.stats ?? refStats;
  const cbbConferenceStats =
    leagueId === "cbb" && cbbConference !== "all"
      ? buildCbbConferenceTendenciesStats(
          refStats,
          refStats.meta.seasons,
          cbbConference,
        )
      : null;
  const homeInsights = buildLeagueHomeInsights({
    leagueId,
    refStats: cbbConferenceStats ?? activeRefStats,
    assignments,
  });
  const upcomingSlate = buildLeagueHubUpcomingSchedule(leagueId, assignments, 10);
  const { games: slateGames, isPreview: slateIsPreview } = resolveSlateGames(assignments);
  const sortedGames = sortSlateGames(leagueId, slateGames, activeRefStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const alertPremiums = paceAlerts(premiums);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const slateStorylines = computeSlateStorylines(sortedGames, refStats, 5);
  const pendingMatchups = upcomingMatchups(assignments).map((game) => game.matchup);
  const pathPrefix = entry.pathPrefix;
  const sport = slateCardSport(leagueId);

  const edgeItems = buildTonightEdgeSummary({
    sport,
    alertPremiums,
    allPremiums: premiums,
    homeBiasSignals,
    storylines: slateStorylines,
    ppPremiums: [],
    otSignals: [],
  });

  const findingLeague = entry.dataLeague as
    | "NBA"
    | "NHL"
    | "NFL"
    | "EPL"
    | "LALIGA"
    | "CBB"
    | "CFB"
    | "WNBA";
  const footerLeague = findingLeague;

  return (
    <div className={`page-shell page-shell-slate${leagueId === "cbb" ? " page-shell-slate--cbb-terminal" : ""}`}>
      <JsonLd
        data={buildLeagueSlateJsonLd(
          leagueSlatePageTitle(leagueId, { isOffseason, isPending }),
          nightlyFeed,
          assignments.lastUpdated,
        )}
      />
      <LeagueSlateHero
        leagueId={leagueId}
        assignments={assignments}
        refStats={scoped?.stats ?? refStats}
        productHome={features.seasonScopeOnSlate && isOffseason}
        showScopeToggle={features.seasonScopeOnSlate && isOffseason}
        scopeLabel={scoped?.scopeLabel}
      />

      {features.upcomingSlateSection && (
        <LeagueHubUpcomingSlateSection
          slate={upcomingSlate}
          leagueLabel={entry.shortLabel}
        />
      )}

      {features.pendingCrewNotice && isPending && (
        <UpcomingSlateNotice
          league={entry.shortLabel}
          note={assignments.note}
          matchups={pendingMatchups}
          slateDate={assignments.nextSlateDate ?? assignments.date}
        />
      )}

      {isOffseason && !features.hideOffseasonNotice && (
        <OffseasonSlateNotice league={findingLeague} />
      )}

      {features.slateFeatureShowcase && isOffseason && <SlateFeatureShowcase />}
      {features.slateQuickLookup && isOffseason && <SlateQuickLookupSection />}

      {features.conferenceCoverage && leagueId === "cbb" && (
        <CbbConferenceNavSection activeConference={cbbConference} />
      )}

      {features.conferenceCoverage && leagueId === "cfb" && (
        <ConferenceCoverage
          leagueId="cfb"
          activeConference="all"
        />
      )}

      {leagueId === "cbb" &&
      cbbConference !== "all" &&
      cbbConferenceStats ? (
        <CbbConferenceHub
          conference={cbbConference as LiveNcaaConferenceId}
          refStats={cbbConferenceStats}
          distinctGames={
            refStats.meta.conferenceCoverageDistinctGames?.[
              cbbConference as LiveNcaaConferenceId
            ] ?? 0
          }
        />
      ) : null}

      {!(leagueId === "cbb" && cbbConference !== "all") ? (
        <LeagueHomeInsightSections
          pulse={homeInsights.pulse}
          matchups={homeInsights.matchups}
          spotlights={homeInsights.spotlights}
          leagueId={leagueId}
          basePath={pathPrefix}
          sport={sport}
        />
      ) : null}

      {features.superBowlSection && (
        <SuperBowlOfficiatingSection variant="home" limit={4} />
      )}

      {features.analyticsLeaders === "nfl" && bundle.nflAnalyticsLeaders && (
        <NflAnalyticsLeaders leaders={bundle.nflAnalyticsLeaders} />
      )}
      {features.analyticsLeaders === "epl" && bundle.eplAnalyticsLeaders && (
        <EplAnalyticsLeaders
          leaders={bundle.eplAnalyticsLeaders}
          hrefPrefix={pathPrefix}
        />
      )}
      {features.analyticsLeaders === "cfb" && bundle.cfbAnalyticsLeaders && (
        <CfbAnalyticsLeaders leaders={bundle.cfbAnalyticsLeaders} />
      )}
      {features.analyticsLeaders === "cbb" &&
        bundle.cbbAnalyticsLeaders &&
        !(leagueId === "cbb" && cbbConference !== "all") && (
          <CbbAnalyticsLeaders leaders={bundle.cbbAnalyticsLeaders} />
        )}

      {!isOffseason && (
        <section className="slate-quick-links">
          <BrowseActionCards league={findingLeague} compact />
        </section>
      )}

      {!isOffseason && (
        <>
          <SlateShareBar
            shareText={buildShareText(nightlyFeed)}
            topSignals={topShareSignals(nightlyFeed, 5)}
            disclaimer={nightlyFeed.disclaimer}
            pageUrl={nightlyFeed.pageUrl}
            league={findingLeague}
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
            {slateIsPreview && (
              <p className="mt-1 text-sm text-zinc-600">
                {`Matchups on the ${new Date(`${assignments.nextSlateDate ?? assignments.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} slate. Crew assignments publish closer to tipoff.`}
              </p>
            )}
            {!slateIsPreview && assignments.source === "espn" && (
              <p className="mt-1 text-sm text-zinc-600">
                Crew assignments from ESPN game summaries.
              </p>
            )}
            <div className="slate-stack mt-4">
              {sortedGames.map((game, index) => (
                <div key={game.id} id={`slate-game-${game.id}`}>
                  <GameSlateCard
                    slateIndex={index}
                    gameId={game.id}
                    matchup={game.matchup}
                    awayTeam={game.awayTeam}
                    homeTeam={game.homeTeam}
                    metrics={computeLeagueCrewMetrics(leagueId, game.crew, activeRefStats)}
                    premium={computeCrewWhistlePremium(game, refStats, odds)}
                    homeBias={computeCrewHomeBias(game, refStats)}
                    sport={sport}
                    basePath={pathPrefix}
                    storylines={computeGameStorylines(game, refStats, 1)}
                    overBenchmark={refStats.meta.leagueOverBaseline}
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <TrustCharterSummary />
      {leagueId === "cbb" ? (
        <CbbResearchFeed />
      ) : (
        <RelatedInsightsFooter league={footerLeague} />
      )}
    </div>
  );
}
