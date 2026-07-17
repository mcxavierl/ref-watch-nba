import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { CbbConferenceTrendsToggle } from "@/components/CbbConferenceTrendsToggle";
import { LeagueSeasonStartBadge } from "@/components/LeagueHeader";
import { LeagueDataSourceBanner } from "@/components/LeagueDataSourceBanner";
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
import { ResearchHubFindings } from "@/components/ResearchHubFindings";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { SeasonScopeToggleSkeleton } from "@/components/LayoutShiftSkeletons";
import { getBaselinesFile } from "@/lib/baselines";
import { leagueGamesHubBackLabel, leagueHubHref, LEAGUES } from "@/lib/leagues";
import {
  loadHubLeagueStats,
  loadLeagueStats,
} from "@/lib/load-league-stats";
import { resolveLeagueVerification } from "@/lib/league-verification";
import { scopedBaselinesSeasons } from "@/lib/scoped-ref-stats";
import { countNotableSignals } from "@/lib/profile-signals";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import { buildResearchFindingEvMap } from "@/lib/ev-calculator";
import { loadLeagueAssignments } from "@/lib/league-odds";
import { getFrictionMatrixDataset } from "@/lib/friction-matrix";
import { getCbbWhistleMatrixDataset } from "@/lib/cbb-whistle-matrix";
import { getCfbPenaltyEngineDataset } from "@/lib/cfb-penalty-engine";
import { computeFindings as computeNbaFindings } from "@/lib/findings";
import { computeFindings as computeCbbFindings } from "@/lib/cbb/findings";
import { computeFindings as computeCfbFindings } from "@/lib/cfb/findings";
import { computeFindings as computeEplFindings } from "@/lib/epl/findings";
import { computeFindings as computeLaligaFindings } from "@/lib/laliga/findings";
import { computeFindings as computeNflFindings } from "@/lib/nfl/findings";
import { computeFindings as computeNhlFindings } from "@/lib/nhl/findings";
import { ContextualLinkerText } from "@/lib/contextual-linker";
import { insightsViewHref } from "@/lib/insights-routes";
import {
  researchHubArticleJsonLd,
  researchHubDatasetJsonLd,
} from "@/lib/syndication";
import type { SeasonScopeMode } from "@/lib/season-scope";
import {
  DEFAULT_SEASON_SCOPE_MODE,
  formatSeasonScope,
  resolveScopedSeasonsForLeague,
} from "@/lib/season-scope";
import { buildYoYNarrative, seasonRowsFromBaselines } from "@/lib/trends";
import {
  buildCbbConferenceTrendRows,
  cbbTrendsConferenceLabel,
} from "@/lib/cbb/conference-trends";
import type { CbbTrendsConferenceScope } from "@/lib/cbb/conference-trends-shared";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import { RANKINGS_PAGE_LEAD } from "@/lib/trust-charter";
import type { Finding, FindingLeague } from "@/lib/findings-shared";
import type { SeasonBaseline } from "../../scripts/lib/baselines";

type InsightsLeagueId = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

const HUB_FINDINGS_COMPUTERS: Record<
  InsightsLeagueId,
  (limit: number, scopedSeasons: string[]) => Finding[]
> = {
  nba: (limit, scopedSeasons) =>
    computeNbaFindings(limit, scopedSeasons, { hub: true }),
  nhl: (limit, scopedSeasons) =>
    computeNhlFindings(limit, scopedSeasons, { hub: true }),
  nfl: (limit, scopedSeasons) =>
    computeNflFindings(limit, scopedSeasons, { hub: true }),
  epl: (limit, scopedSeasons) =>
    computeEplFindings(limit, scopedSeasons, { hub: true }),
  laliga: (limit, scopedSeasons) =>
    computeLaligaFindings(limit, scopedSeasons, { hub: true }),
  cbb: (limit, scopedSeasons) =>
    computeCbbFindings(limit, scopedSeasons, { hub: true }),
  cfb: (limit, scopedSeasons) =>
    computeCfbFindings(limit, scopedSeasons, { hub: true }),
};

type InsightsHubPageProps = {
  leagueId: InsightsLeagueId;
  defaultTab?: "tendencies" | "trends" | "findings";
  scopeMode?: SeasonScopeMode;
  cbbTrendsConference?: CbbTrendsConferenceScope;
};

function insightsDataLeague(leagueId: InsightsLeagueId): FindingLeague {
  return LEAGUES[leagueId].dataLeague as FindingLeague;
}

function seasonsWithGameData(
  stats: ReturnType<typeof loadLeagueStats>["stats"],
): string[] {
  const covered = new Set<string>();
  for (const ref of stats.refs) {
    for (const season of ref.seasons) covered.add(season);
  }
  const pool = [...stats.meta.seasons].sort();
  const filtered = pool.filter((season) => covered.has(season));
  return filtered.length > 0 ? filtered : pool;
}

/** Trends only needs meta + scoped seasons — skip ref rebuilds and findings. */
function loadTrendsScopeContext(
  leagueId: InsightsLeagueId,
  scopeMode: SeasonScopeMode,
) {
  const { stats, formatRange } = loadLeagueStats(leagueId);
  const availableSeasons = seasonsWithGameData(stats);
  const scopedSeasons = resolveScopedSeasonsForLeague(
    leagueId,
    scopeMode,
    availableSeasons,
  );
  return {
    stats,
    formatRange,
    scopedSeasons,
    availableSeasons,
    scopeLabel: formatSeasonScope(scopedSeasons.length),
  };
}

export function InsightsHubPage({
  leagueId,
  defaultTab = "tendencies",
  scopeMode = DEFAULT_SEASON_SCOPE_MODE,
  cbbTrendsConference = "all",
}: InsightsHubPageProps) {
  const league = LEAGUES[leagueId];
  const homeHref = leagueHubHref(leagueId);
  const dataLeague = insightsDataLeague(leagueId);
  const activeView = defaultTab;

  const scopeContext =
    activeView === "trends"
      ? loadTrendsScopeContext(leagueId, scopeMode)
      : loadHubLeagueStats(leagueId, scopeMode);

  const {
    stats,
    formatRange,
    scopedSeasons,
    scopeLabel,
    availableSeasons,
  } = scopeContext;

  const verification = resolveLeagueVerification(leagueId, stats.meta, stats);
  const showDataSourceBanner =
    !verification.data_verified && leagueId === "cfb";
  const range = formatRange(stats.meta);

  const hubFindings =
    leagueId === "cbb"
      ? HUB_FINDINGS_COMPUTERS.cbb(12, scopedSeasons).map((finding) => ({
          ...finding,
          league: dataLeague,
        }))
      : [];
  const cbbHasFindings = leagueId !== "cbb" || hubFindings.length > 0;

  if (leagueId === "cbb" && activeView === "findings" && !cbbHasFindings) {
    redirect(insightsViewHref("cbb", "tendencies"));
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
        {leagueId === "cbb" && activeView === "trends" ? (
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
        {leagueId === "cbb" && activeView === "trends" ? (
          <Suspense fallback={<SeasonScopeToggleSkeleton />}>
            <CbbConferenceTrendsToggle />
          </Suspense>
        ) : null}
      </div>
    </div>
  );

  let tendenciesPanel: ReactNode = null;
  let tendenciesHeroHighlights: ReactNode = null;
  if (activeView === "tendencies") {
    const synthesis = buildRankingsSynthesis(stats, league);
    const signalCounts = Object.fromEntries(
      stats.refs.map((ref) => [
        ref.slug,
        countNotableSignals(ref, stats.meta, leagueId),
      ]),
    );
    tendenciesHeroHighlights = (
      <RankingsInsightCards
        synthesis={synthesis}
        basePath={league.pathPrefix}
        leagueId={leagueId}
        variant="hero"
      />
    );
    tendenciesPanel = (
      <section className="section-block">
        <div className="data-card">
          <RefRankingsTable
            refs={stats.refs}
            league={dataLeague}
            minSampleSize={stats.meta.minSampleSize}
            overBaseline={stats.meta.leagueOverBaseline}
            leagueAvgTotal={stats.meta.leagueAvgTotal}
            atsAvailable={stats.meta.atsAvailable === true}
            signalCounts={signalCounts}
            basePath={league.pathPrefix}
          />
        </div>
      </section>
    );
  }

  let trendsPanel: ReactNode = null;
  if (activeView === "trends") {
    trendsPanel = (
      <>
        {narrative && (
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
        )}
        <section className="section-block">
          <LeagueTrendsTable leagueId={leagueId} rows={rows} />
        </section>
      </>
    );
  }

  let findingsPanel: ReactNode = null;
  if (activeView === "findings") {
    const findings =
      leagueId === "cbb"
        ? hubFindings
        : HUB_FINDINGS_COMPUTERS[leagueId](12, scopedSeasons).map((finding) => ({
            ...finding,
            league: dataLeague,
          }));
    const evByFindingId = buildResearchFindingEvMap(
      findings,
      stats,
      leagueId,
      scopedSeasons,
      loadLeagueAssignments(leagueId),
    );
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
        <JsonLd
          data={[
            researchHubDatasetJsonLd(
              dataLeague,
              findings.length,
              stats.meta.lastUpdated,
            ),
            researchHubArticleJsonLd(
              dataLeague,
              findings.length,
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
            findings={findings}
            league={dataLeague}
            refCount={stats.refs.length}
            evByFindingId={evByFindingId}
          />
        </Suspense>
      </>
    );
  }

  return (
    <div className="page-shell page-shell-insights">
      {showDataSourceBanner ? (
        <LeagueDataSourceBanner league={leagueId} meta={stats.meta} />
      ) : null}

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
            {activeView === "tendencies" ? tendenciesHeroHighlights : null}
            <p className="insights-hero-lead">
              Actionable ref tendencies, league trends, and ranked findings - built
              for match-level edge discovery.
            </p>
          </>
        }
        afterTablist={scopeMeta}
        tabs={[
          {
            id: "tendencies",
            label: "Tendencies",
            note:
              activeView === "tendencies" ? (
                <>{RANKINGS_PAGE_LEAD}</>
              ) : null,
            panel: tendenciesPanel,
          },
          {
            id: "trends",
            label: "Trends",
            note:
              activeView === "trends" ? (
                <>
                  {scopeLabel}{" "}
                  {leagueId === "cbb"
                    ? "scoring and whistle baselines by conference from game logs"
                    : "scoring and whistle baselines from game logs"}{" "}
                  ({range}). Historical context only.
                </>
              ) : null,
            panel: trendsPanel,
          },
          ...(cbbHasFindings
            ? [
                {
                  id: "findings" as const,
                  label: "Findings",
                  note:
                    activeView === "findings" ? (
                      <>
                        Ranked by effect size and sample size across {range}.
                        Descriptive historical tendencies, not betting advice.
                      </>
                    ) : null,
                  panel: findingsPanel,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
