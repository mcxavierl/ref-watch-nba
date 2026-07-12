import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { LeagueDataSourceBanner } from "@/components/LeagueDataSourceBanner";
import { LeagueHubTabs } from "@/components/LeagueHubTabs";
import { LeagueTrendsTable } from "@/components/LeagueTrendsTable";
import { RankingsInsightCards } from "@/components/RankingsInsightCards";
import { RefRankingsTable } from "@/components/RefRankingsTable";
import { ResearchHubFindings } from "@/components/ResearchHubFindings";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { getBaselinesFile } from "@/lib/baselines";
import { leagueHubHref, LEAGUES } from "@/lib/leagues";
import {
  loadHubLeagueStats,
  loadLeagueStats,
} from "@/lib/load-league-stats";
import { resolveLeagueVerification } from "@/lib/league-verification";
import { scopedBaselinesSeasons } from "@/lib/scoped-ref-stats";
import { countNotableSignals } from "@/lib/profile-signals";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import { computeFindings as computeNbaFindings } from "@/lib/findings";
import { computeFindings as computeCbbFindings } from "@/lib/cbb/findings";
import { computeFindings as computeCfbFindings } from "@/lib/cfb/findings";
import { computeFindings as computeEplFindings } from "@/lib/epl/findings";
import { computeFindings as computeLaligaFindings } from "@/lib/laliga/findings";
import { computeFindings as computeNflFindings } from "@/lib/nfl/findings";
import { computeFindings as computeNhlFindings } from "@/lib/nhl/findings";
import { researchHubDatasetJsonLd } from "@/lib/syndication";
import type { SeasonScopeMode } from "@/lib/season-scope";
import {
  DEFAULT_SEASON_SCOPE_MODE,
  formatSeasonScope,
  resolveScopedSeasonsForLeague,
} from "@/lib/season-scope";
import { buildYoYNarrative, seasonRowsFromBaselines } from "@/lib/trends";
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

  const verification = resolveLeagueVerification(leagueId, stats.meta);
  const showDataSourceBanner =
    !verification.data_verified &&
    (leagueId === "cbb" || leagueId === "cfb");
  const range = formatRange(stats.meta);

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
  const rows = seasonRowsFromBaselines(scopedBaselineSeasons);
  const narrative = buildYoYNarrative(rows, dataLeague);

  const scopeMeta = (
    <div className="insights-hero-meta">
      <p className="insights-hero-meta-copy">
        Showing <span className="insights-hero-meta-strong">{scopeLabel}</span>{" "}
        ({range})
      </p>
      <Suspense fallback={null}>
        <SeasonScopeToggle
          leagueId={leagueId}
          availableSeasons={availableSeasons}
        />
      </Suspense>
    </div>
  );

  let tendenciesPanel: ReactNode = null;
  if (activeView === "tendencies") {
    const synthesis = buildRankingsSynthesis(stats, league);
    const signalCounts = Object.fromEntries(
      stats.refs.map((ref) => [
        ref.slug,
        countNotableSignals(ref, stats.meta, leagueId),
      ]),
    );
    tendenciesPanel = (
      <>
        <RankingsInsightCards
          synthesis={synthesis}
          basePath={league.pathPrefix}
        />
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
      </>
    );
  }

  let trendsPanel: ReactNode = null;
  if (activeView === "trends") {
    trendsPanel = (
      <>
        {narrative && (
          <section className="section-block-tight mb-4">
            <div className="panel-inset px-4 py-4 sm:px-5">
              <h2 className="text-sm font-bold text-zinc-900">{narrative.headline}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {narrative.body}
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
    const findings = HUB_FINDINGS_COMPUTERS[leagueId](12, scopedSeasons).map(
      (finding) => ({
        ...finding,
        league: dataLeague,
      }),
    );
    findingsPanel = (
      <>
        <JsonLd
          data={researchHubDatasetJsonLd(
            dataLeague,
            findings.length,
            stats.meta.lastUpdated,
          )}
        />
        <Suspense fallback={<p className="mt-6 text-sm text-zinc-600">Loading findings…</p>}>
          <ResearchHubFindings
            findings={findings}
            league={dataLeague}
            refCount={stats.refs.length}
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
              ← {league.shortLabel} slate
            </Link>
            <h1 className="insights-hero-title">
              {league.shortLabel} insights
            </h1>
            <p className="insights-hero-lead">
              Tendency index, league-wide trends, and ranked dataset findings in
              one place.
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
                <>
                  {RANKINGS_PAGE_LEAD} Sample: {stats.refs.length} officials (
                  {range}).
                </>
              ) : null,
            panel: tendenciesPanel,
          },
          {
            id: "trends",
            label: "Trends",
            note:
              activeView === "trends" ? (
                <>
                  {scopeLabel} scoring and whistle baselines from game logs (
                  {range}). Historical context only.
                </>
              ) : null,
            panel: trendsPanel,
          },
          {
            id: "findings",
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
        ]}
      />
    </div>
  );
}
