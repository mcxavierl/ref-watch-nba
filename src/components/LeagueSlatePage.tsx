import { BrowseActionCards } from "@/components/BrowseActionCards";
import { ConferenceCoverage } from "@/components/ConferenceCoverage";
import { FindingsSection } from "@/components/FindingsSection";
import { GameSlateCard } from "@/components/GameSlateCard";
import { JsonLd } from "@/components/JsonLd";
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
import { LEAGUE_MANIFEST, type LeagueManifestId } from "@/lib/league-manifest";
import { buildTonightEdgeSummary } from "@/lib/edge-summary";
import {
  computeCrewMetrics,
  ouLeanSortWeight,
} from "@/lib/data";
import {
  computeGameStorylines,
  computeSlateStorylines,
  resolveSlateGames,
} from "@/lib/grudge-match";
import { computeCrewHomeBias, computeSlateHomeBias } from "@/lib/home-bias";
import { isSlateLeagueId, loadLeagueSlateBundle } from "@/lib/league-slate-data";
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import { upcomingMatchups } from "@/lib/offseason";
import { buildLeagueUpcomingSlateFromAssignments } from "@/lib/overview-upcoming-slate";
import { readSeasonScopeParam } from "@/lib/season-scope";
import {
  buildShareText,
  buildLeagueSlateJsonLd,
  topShareSignals,
} from "@/lib/syndication";
import { leagueSlatePageTitle } from "@/lib/seo";
import {
  FINDINGS_SORT_EXPLAINER,
  NO_SIGNAL_SLATE_COPY,
  TONIGHT_SIGNALS_TITLE,
} from "@/lib/trust-charter";
import {
  computeCrewWhistlePremium,
  computeSlatePremiums,
  paceAlerts,
} from "@/lib/whistle-premium";
import type { AssignmentGame, RefStatsFile } from "@/lib/types";

function sortSlateGames(games: AssignmentGame[], refStats: RefStatsFile) {
  return [...games].sort((a, b) => {
    const aMetrics = computeCrewMetrics(a.crew, refStats);
    const bMetrics = computeCrewMetrics(b.crew, refStats);
    const leanDiff =
      ouLeanSortWeight(bMetrics.ouLean) - ouLeanSortWeight(aMetrics.ouLean);
    if (leanDiff !== 0) return leanDiff;
    return a.matchup.localeCompare(b.matchup);
  });
}

type LeagueSlatePageProps = {
  leagueId: LeagueManifestId;
  searchParams: Promise<{ scope?: string }>;
};

export async function LeagueSlatePage({ leagueId, searchParams }: LeagueSlatePageProps) {
  if (!isSlateLeagueId(leagueId)) {
    throw new Error(`LeagueSlatePage does not support ${leagueId}`);
  }

  const entry = LEAGUE_MANIFEST[leagueId];
  const features = entry.slate;
  const { scope } = await searchParams;
  const scopeMode = readSeasonScopeParam(scope);
  const scoped =
    features.seasonScopeOnSlate
      ? loadScopedLeagueStats(leagueId, scopeMode)
      : null;
  const bundle = loadLeagueSlateBundle(leagueId);
  const { assignments, refStats, odds, nightlyFeed, isOffseason, isPending } = bundle;
  const findings = bundle.findings(6, scoped?.scopedSeasons);
  const upcomingSlate = buildLeagueUpcomingSlateFromAssignments(leagueId, assignments);
  const { games: slateGames, isPreview: slateIsPreview } = resolveSlateGames(assignments);
  const sortedGames = sortSlateGames(slateGames, refStats);
  const premiums = computeSlatePremiums(sortedGames, refStats, odds);
  const alertPremiums = paceAlerts(premiums);
  const homeBiasSignals = computeSlateHomeBias(sortedGames, refStats);
  const slateStorylines = computeSlateStorylines(sortedGames, refStats, 5);
  const pendingMatchups = upcomingMatchups(assignments).map((game) => game.matchup);
  const pathPrefix = entry.pathPrefix;
  const sport = leagueId as "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

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
    | "CFB";
  const footerLeague = findingLeague;

  return (
    <div className="page-shell page-shell-slate">
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

      {features.conferenceCoverage && (leagueId === "cbb" || leagueId === "cfb") && (
        <ConferenceCoverage leagueId={leagueId} />
      )}

      <FindingsSection
        findings={findings}
        featured
        slateHero
        initialVisibleCount={4}
        title={
          isOffseason
            ? "Season highlights"
            : features.findingsInSeasonTitle ?? "Officiating intelligence"
        }
        sectionLead={
          isOffseason && features.seasonScopeOnFindings
            ? "Ranked historical edges with over/under signals, ordered by effect size and sample depth."
            : undefined
        }
        league={findingLeague}
        showScopeToggle={features.seasonScopeOnFindings}
        scopeLeagueId={features.seasonScopeOnFindings ? leagueId : undefined}
        scopeLabel={
          scoped
            ? `${scoped.scopeLabel} · ${scoped.formatRange(scoped.stats.meta)}`
            : undefined
        }
        sortExplainer={FINDINGS_SORT_EXPLAINER}
      />

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
                  sport={sport}
                  basePath={pathPrefix}
                  storylines={computeGameStorylines(game, refStats, 1)}
                  overBenchmark={refStats.meta.leagueOverBaseline}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <TrustCharterSummary />
      <RelatedInsightsFooter league={footerLeague} />
    </div>
  );
}
