import { Suspense } from "react";
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
import { LEAGUES } from "@/lib/leagues";
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import { resolveLeagueVerification } from "@/lib/league-verification";
import { scopedBaselinesSeasons } from "@/lib/scoped-ref-stats";
import { countNotableSignals } from "@/lib/profile-signals";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import { computeResearchFindingsForLeague } from "@/lib/research";
import { researchHubDatasetJsonLd } from "@/lib/syndication";
import type { SeasonScopeMode } from "@/lib/season-scope";
import { DEFAULT_SEASON_SCOPE_MODE } from "@/lib/season-scope";
import { buildYoYNarrative, seasonRowsFromBaselines } from "@/lib/trends";
import { RANKINGS_PAGE_LEAD } from "@/lib/trust-charter";
import type { FindingLeague } from "@/lib/findings-shared";
import type { SeasonBaseline } from "../../scripts/lib/baselines";

type InsightsLeagueId = "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";

type InsightsHubPageProps = {
  leagueId: InsightsLeagueId;
  defaultTab?: "tendencies" | "trends" | "findings";
  scopeMode?: SeasonScopeMode;
};

function insightsDataLeague(leagueId: InsightsLeagueId): FindingLeague {
  return LEAGUES[leagueId].dataLeague as FindingLeague;
}

export function InsightsHubPage({
  leagueId,
  defaultTab = "tendencies",
  scopeMode = DEFAULT_SEASON_SCOPE_MODE,
}: InsightsHubPageProps) {
  const league = LEAGUES[leagueId];
  const {
    stats,
    formatRange,
    scopedSeasons,
    scopeLabel,
  } = loadScopedLeagueStats(leagueId, scopeMode);
  const verification = resolveLeagueVerification(leagueId, stats.meta);
  const showDataSourceBanner =
    leagueId !== "nba" &&
    (verification.data_verified || (leagueId !== "nfl" && leagueId !== "nhl"));
  const range = formatRange(stats.meta);
  const homeHref = league.pathPrefix || "/";
  const dataLeague = insightsDataLeague(leagueId);
  const findings = computeResearchFindingsForLeague(dataLeague, scopedSeasons);
  const baselines = getBaselinesFile();
  const scopedBaselineSeasons = scopedBaselinesSeasons(
    baselines[dataLeague].seasons,
    scopedSeasons,
  ) as Record<string, SeasonBaseline>;
  const rows = seasonRowsFromBaselines(scopedBaselineSeasons);
  const narrative = buildYoYNarrative(rows, dataLeague);
  const synthesis = buildRankingsSynthesis(stats, league);
  const signalCounts = Object.fromEntries(
    stats.refs.map((ref) => [
      ref.slug,
      countNotableSignals(ref, stats.meta, leagueId),
    ]),
  );

  const scopeToolbar = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-zinc-600">
        Showing <span className="font-medium text-zinc-800">{scopeLabel}</span>{" "}
        ({range})
      </p>
      <Suspense fallback={null}>
        <SeasonScopeToggle />
      </Suspense>
    </div>
  );

  const tendenciesPanel = (
    <>
      {scopeToolbar}
      <p className="section-lead mb-4">
        {RANKINGS_PAGE_LEAD} Sample: {stats.refs.length} officials ({range}).
      </p>
      <RankingsInsightCards synthesis={synthesis} />
      <section className="section-block">
        <div className="data-card">
          <RefRankingsTable
            refs={stats.refs}
            league={dataLeague}
            minSampleSize={stats.meta.minSampleSize}
            overBaseline={stats.meta.leagueOverBaseline}
            signalCounts={signalCounts}
          />
        </div>
      </section>
    </>
  );

  const trendsPanel = (
    <>
      {scopeToolbar}
      <p className="section-lead mb-4">
        {scopeLabel} scoring and whistle baselines from game logs ({range}).
        Historical context only.
      </p>
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

  const findingsPanel = (
    <>
      {scopeToolbar}
      <JsonLd
        data={researchHubDatasetJsonLd(
          dataLeague,
          findings.length,
          stats.meta.lastUpdated,
        )}
      />
      <p className="section-lead mb-4">
        {findings.length} findings ranked by effect size and sample size across{" "}
        {range}. Descriptive historical tendencies, not betting advice.
      </p>
      <ResearchHubFindings
        findings={findings}
        league={dataLeague}
        refCount={stats.refs.length}
      />
    </>
  );

  return (
    <div className="page-shell">
      <Link href={homeHref} className="back-link">
        ← {league.shortLabel} slate
      </Link>

      <section className="page-hero">
        <h1 className="page-title">{league.shortLabel} insights</h1>
        <p className="page-lead">
          Tendency index, league-wide trends, and ranked dataset findings in one
          place.
        </p>
      </section>

      {showDataSourceBanner ? (
        <LeagueDataSourceBanner league={leagueId} meta={stats.meta} />
      ) : null}

      <LeagueHubTabs
        ariaLabel="Insights views"
        defaultTabId={defaultTab}
        tabs={[
          { id: "tendencies", label: "Tendencies", panel: tendenciesPanel },
          { id: "trends", label: "Trends", panel: trendsPanel },
          { id: "findings", label: "Findings", panel: findingsPanel },
        ]}
      />
    </div>
  );
}
