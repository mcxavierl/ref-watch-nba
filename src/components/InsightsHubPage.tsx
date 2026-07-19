import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { CbbConferenceTrendsToggle } from "@/components/CbbConferenceTrendsToggle";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import { LeagueHubTabs } from "@/components/LeagueHubTabs";
import { LeagueTrendsTable } from "@/components/LeagueTrendsTable";
import { RankingsInsightCards } from "@/components/RankingsInsightCards";
import { RefRankingsTable } from "@/components/RefRankingsTable";
import { FrictionGrudgeMatrixSection } from "@/components/FrictionGrudgeMatrixSection";
import {
  CbbWhistleMatrixSection,
  CfbPenaltyEngineSection,
} from "@/components/NcaaAnalyticsResearchSection";
import { WhistleDispositionResearchSection } from "@/components/WhistleDispositionResearchSection";
import { GameStateIndexResearchSection } from "@/components/GameStateIndexResearchSection";
import { ResearchHubFindings } from "@/components/ResearchHubFindings";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { SeasonScopeToggleSkeleton } from "@/components/LayoutShiftSkeletons";
import { getBaselinesFile } from "@/lib/baselines";
import { leagueGamesHubBackLabel, leagueHubHref, LEAGUES } from "@/lib/leagues";
import {
  loadHubLeagueStats,
  loadLeagueStats,
} from "@/lib/load-league-stats";
import { scopedBaselinesSeasons } from "@/lib/scoped-ref-stats";
import { countNotableSignals } from "@/lib/profile-signals";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import {
  heroSynthesisForView,
  rankingsConfigForView,
  type InsightsHubView,
} from "@/lib/insights-hero-content";
import {
  INSIGHTS_HUB_TAB_LABELS,
  insightsHubTabViews,
  leagueSupportsInsightsView,
} from "@/lib/insights-hub-config";
import { computeHubFindings } from "@/lib/hub-findings-registry";
import {
  leagueHasResearchView,
  leagueManifestEntry,
  type InsightsLeagueId,
  type ResearchView,
} from "@/lib/league-manifest";
import { ContextualLinkerText } from "@/lib/contextual-linker";
import { insightsViewHref } from "@/lib/insights-routes";
import { getFrictionMatrixDataset } from "@/lib/friction-matrix";
import { getCbbWhistleMatrixDataset } from "@/lib/cbb-whistle-matrix";
import { getCfbPenaltyEngineDataset } from "@/lib/cfb-penalty-engine";
import {
  researchHubArticleJsonLd,
  researchHubDatasetJsonLd,
} from "@/lib/syndication";
import type { SeasonScopeMode } from "@/lib/season-scope";
import {
  DEFAULT_SEASON_SCOPE_MODE,
} from "@/lib/season-scope";
import { buildYoYNarrative, seasonRowsFromBaselines } from "@/lib/trends";
import {
  buildCbbConferenceTrendRows,
  cbbTrendsConferenceLabel,
} from "@/lib/cbb/conference-trends";
import { buildCbbConferenceTendenciesStats } from "@/lib/cbb/conference-tendencies";
import type { CbbTrendsConferenceScope } from "@/lib/cbb/conference-trends-shared";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { FindingLeague } from "@/lib/findings-shared";
import type { ResearchFinding } from "@/lib/research";
import type { SeasonBaseline } from "../../scripts/lib/baselines";

function hubFindingsForLeague(
  leagueId: InsightsLeagueId,
  scopedSeasons: string[],
  dataLeague: FindingLeague,
): ResearchFinding[] {
  return computeHubFindings(leagueId, 12, scopedSeasons).map((finding) => ({
    ...finding,
    league: dataLeague,
  }));
}

function rankingStatsForView(
  leagueId: InsightsLeagueId,
  activeView: InsightsHubView,
  stats: ReturnType<typeof loadLeagueStats>["stats"],
  scopedSeasons: string[],
  cbbTrendsConference: CbbTrendsConferenceScope,
) {
  if (
    leagueId === "cbb" &&
    (activeView === "tendencies" || activeView === "trends")
  ) {
    return buildCbbConferenceTendenciesStats(
      stats,
      scopedSeasons,
      cbbTrendsConference,
    );
  }
  return stats;
}

function renderRankingsPanel(input: {
  activeView: InsightsHubView;
  rankingStats: ReturnType<typeof loadLeagueStats>["stats"];
  league: (typeof LEAGUES)[InsightsLeagueId];
  dataLeague: FindingLeague;
  leagueId: InsightsLeagueId;
  findings: ResearchFinding[];
  signalCounts: Record<string, number>;
}) {
  const synthesis = buildRankingsSynthesis(input.rankingStats, input.league);
  const rankingsConfig = rankingsConfigForView(input.activeView, {
    refs: input.rankingStats.refs,
    synthesis,
    findings: input.findings,
  });
  const tableRefs = rankingsConfig.refs ?? input.rankingStats.refs;

  return (
    <section className="section-block section-block-tight insights-rankings-hook">
      <div className="data-card">
        <RefRankingsTable
          refs={tableRefs}
          league={input.dataLeague}
          minSampleSize={input.rankingStats.meta.minSampleSize}
          overBaseline={input.rankingStats.meta.leagueOverBaseline}
          leagueAvgTotal={input.rankingStats.meta.leagueAvgTotal}
          atsAvailable={input.rankingStats.meta.atsAvailable === true}
          signalCounts={input.signalCounts}
          basePath={input.league.pathPrefix}
          defaultSort={rankingsConfig.defaultSort}
          filterSlugs={rankingsConfig.filterSlugs}
          preserveOrder={rankingsConfig.preserveOrder}
        />
      </div>
    </section>
  );
}

type InsightsHubPageProps = {
  leagueId: InsightsLeagueId;
  defaultTab?: "tendencies" | "trends" | "findings" | "game-state";
  scopeMode?: SeasonScopeMode;
  cbbTrendsConference?: CbbTrendsConferenceScope;
};

function insightsDataLeague(leagueId: InsightsLeagueId): FindingLeague {
  return LEAGUES[leagueId].dataLeague as FindingLeague;
}

export function InsightsHubPage({
  leagueId,
  defaultTab = "tendencies",
  scopeMode = DEFAULT_SEASON_SCOPE_MODE,
  cbbTrendsConference = "all",
}: InsightsHubPageProps) {
  const manifest = leagueManifestEntry(leagueId);
  const league = LEAGUES[leagueId];
  const homeHref = leagueHubHref(leagueId);
  const dataLeague = insightsDataLeague(leagueId);
  const activeView = defaultTab;

  const scopeContext = loadHubLeagueStats(leagueId, scopeMode);

  const {
    stats,
    formatRange,
    scopedSeasons,
    scopeLabel,
    availableSeasons,
  } = scopeContext;

  const range = formatRange(stats.meta);

  const hubFindings = hubFindingsForLeague(leagueId, scopedSeasons, dataLeague);
  const cbbHasFindings = leagueId !== "cbb" || hubFindings.length > 0;
  const tabOptions = { cbbHasFindings };

  if (leagueId === "cbb" && activeView === "findings" && !cbbHasFindings) {
    redirect(insightsViewHref("cbb", "tendencies"));
  }

  if (
    !leagueSupportsInsightsView(leagueId, activeView as ResearchView, tabOptions)
  ) {
    redirect(insightsViewHref(leagueId, "tendencies"));
  }

  const baselines = getBaselinesFile();
  const baselineKey = dataLeague === "LALIGA" ? "EPL" : dataLeague;
  const leagueBaselines = baselines[baselineKey];
  let scopedBaselineSeasons = scopedBaselinesSeasons(
    leagueBaselines.seasons,
    scopedSeasons,
  ) as Record<string, SeasonBaseline>;
  if (
    Object.keys(scopedBaselineSeasons).length === 0 &&
    Object.keys(leagueBaselines.seasons).length > 0
  ) {
    scopedBaselineSeasons = leagueBaselines.seasons as Record<
      string,
      SeasonBaseline
    >;
  }
  const rows =
    leagueId === "cbb" && activeView === "trends"
      ? buildCbbConferenceTrendRows(
          loadRuntimeGameLogs("CBB")?.games ?? [],
          scopedSeasons,
          cbbTrendsConference,
        )
      : seasonRowsFromBaselines(scopedBaselineSeasons);
  const trendsSubjectLabel =
    leagueId === "cbb" && activeView === "trends"
      ? cbbTrendsConferenceLabel(cbbTrendsConference)
      : undefined;
  const narrative = buildYoYNarrative(rows, dataLeague, trendsSubjectLabel);

  const scopeMeta = (
    <div className="insights-hero-meta">
      <p className="insights-hero-meta-copy">
        Showing <span className="insights-hero-meta-strong">{scopeLabel}</span>{" "}
        ({range})
        {leagueId === "cbb" &&
        (activeView === "trends" || activeView === "tendencies") ? (
          <>
            {" "}
            for{" "}
            <span className="insights-hero-meta-strong">
              {cbbTrendsConferenceLabel(cbbTrendsConference)}
            </span>
          </>
        ) : null}
      </p>
      <div className="insights-hero-meta-controls">
        <Suspense fallback={<SeasonScopeToggleSkeleton />}>
          <SeasonScopeToggle
            leagueId={leagueId}
            availableSeasons={availableSeasons}
          />
        </Suspense>
        {leagueId === "cbb" &&
        (activeView === "trends" || activeView === "tendencies") ? (
          <Suspense fallback={<SeasonScopeToggleSkeleton />}>
            <CbbConferenceTrendsToggle />
          </Suspense>
        ) : null}
      </div>
    </div>
  );

  const rankingStats = rankingStatsForView(
    leagueId,
    activeView as InsightsHubView,
    stats,
    scopedSeasons,
    cbbTrendsConference,
  );
  const findingsForView = hubFindingsForLeague(
    leagueId,
    scopedSeasons,
    dataLeague,
  );
  const heroSynthesis = heroSynthesisForView(
    activeView as InsightsHubView,
    rankingStats,
    league,
    findingsForView,
  );
  const signalCounts = Object.fromEntries(
    rankingStats.refs.map((ref) => [
      ref.slug,
      countNotableSignals(ref, rankingStats.meta, leagueId),
    ]),
  );
  const rankingsHook = renderRankingsPanel({
    activeView: activeView as InsightsHubView,
    rankingStats,
    league,
    dataLeague,
    leagueId,
    findings: findingsForView,
    signalCounts,
  });
  const heroHighlights =
    heroSynthesis.insights.length > 0 ? (
      <RankingsInsightCards
        synthesis={heroSynthesis}
        basePath={league.pathPrefix}
        leagueId={leagueId}
        variant="hero"
      />
    ) : null;

  const tendenciesPanel: ReactNode = rankingsHook;

  let trendsPanel: ReactNode = null;
  if (activeView === "trends") {
    trendsPanel = (
      <>
        {rankingsHook}
        {narrative ? (
          <section className="section-block-tight mb-4">
            <div className="insights-trends-panel panel-inset px-4 py-4 sm:px-5">
              <div className="insights-trends-panel-head">
                <h2 className="insights-trends-title">{narrative.headline}</h2>
                <LeagueSeasonStartBadge leagueId={leagueId} />
              </div>
              <p className="insights-trends-body">
                <ContextualLinkerText text={narrative.body} />
              </p>
            </div>
          </section>
        ) : null}
        <section className="section-block">
          <LeagueTrendsTable leagueId={leagueId} rows={rows} />
        </section>
      </>
    );
  }

  let gameStatePanel: ReactNode = null;
  if (
    activeView === "game-state" &&
    leagueHasResearchView(leagueId, "game-state")
  ) {
    gameStatePanel = (
      <>
        {rankingsHook}
        <GameStateIndexResearchSection
          stats={stats}
          leagueId={leagueId}
          basePath={league.pathPrefix}
          compactHub
        />
      </>
    );
  }

  let findingsPanel: ReactNode = null;
  if (activeView === "findings") {
    const frictionDataset = getFrictionMatrixDataset(leagueId, stats);
    const cbbWhistleDataset =
      leagueId === "cbb"
        ? getCbbWhistleMatrixDataset(stats, scopedSeasons)
        : null;
    const cfbPenaltyDataset =
      leagueId === "cfb"
        ? getCfbPenaltyEngineDataset(stats, scopedSeasons)
        : null;
    findingsPanel = (
      <>
        {rankingsHook}
        <JsonLd
          data={[
            researchHubDatasetJsonLd(
              dataLeague,
              findingsForView.length,
              stats.meta.lastUpdated,
            ),
            researchHubArticleJsonLd(
              dataLeague,
              findingsForView.length,
              stats.meta.lastUpdated,
            ),
          ]}
        />
        {cbbWhistleDataset ? (
          <CbbWhistleMatrixSection
            outliers={cbbWhistleDataset.outliers}
            basePath={league.pathPrefix}
          />
        ) : null}
        {cfbPenaltyDataset ? (
          <CfbPenaltyEngineSection
            outliers={cfbPenaltyDataset.outliers}
            basePath={league.pathPrefix}
          />
        ) : null}
        <FrictionGrudgeMatrixSection
          findings={frictionDataset.findings}
          leagueId={leagueId}
          basePath={league.pathPrefix}
          minHeadToHeadGames={frictionDataset.minHeadToHeadGames}
        />
        <WhistleDispositionResearchSection
          stats={stats}
          leagueId={leagueId}
          scopedSeasons={scopedSeasons}
          basePath={league.pathPrefix}
        />
        <Suspense fallback={<p className="insights-loading-copy">Loading findings…</p>}>
          <ResearchHubFindings
            findings={findingsForView}
            league={dataLeague}
            refCount={stats.refs.length}
          />
        </Suspense>
      </>
    );
  }

  return (
    <div className="page-shell page-shell-insights">
      <LeagueHubTabs
        ariaLabel="Insights views"
        defaultTabId={activeView}
        variant="insights"
        leagueId={leagueId}
        before={
          <>
            <Link href={homeHref} className="insights-hero-back">
              ← {leagueGamesHubBackLabel(leagueId)}
            </Link>
            <h1 className="insights-hero-title">
              {league.shortLabel} insights
            </h1>
            {heroHighlights}
          </>
        }
        afterTablist={scopeMeta}
        tabs={insightsHubTabViews(leagueId, tabOptions).map((view) => ({
          id: view,
          label: INSIGHTS_HUB_TAB_LABELS[view],
          panel:
            view === "tendencies"
              ? tendenciesPanel
              : view === "trends"
                ? trendsPanel
                : view === "game-state"
                  ? gameStatePanel
                  : findingsPanel,
        }))}
      />
    </div>
  );
}
