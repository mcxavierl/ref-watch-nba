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
  const availableSeasons = stats.meta.seasons;
  const verification = resolveLeagueVerification(leagueId, stats.meta);
  const showDataSourceBanner =
    !verification.data_verified &&
    (leagueId === "cbb" || leagueId === "cfb");
  const range = formatRange(stats.meta);
  const homeHref = league.pathPrefix || "/";
  const dataLeague = insightsDataLeague(leagueId);
  const findings = computeResearchFindingsForLeague(dataLeague, scopedSeasons);
  const baselines = getBaselinesFile();
  const leagueBaselines = baselines[dataLeague];
  let scopedBaselineSeasons = scopedBaselinesSeasons(
    leagueBaselines.seasons,
    scopedSeasons,
  ) as Record<string, SeasonBaseline>;
  // If scope keys don't overlap (label drift), still show full computed seasons.
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
  const synthesis = buildRankingsSynthesis(stats, league);
  const signalCounts = Object.fromEntries(
    stats.refs.map((ref) => [
      ref.slug,
      countNotableSignals(ref, stats.meta, leagueId),
    ]),
  );

  const scopeMeta = (
    <div className="insights-hero-meta">
      <p className="insights-hero-meta-copy">
        Showing <span className="insights-hero-meta-strong">{scopeLabel}</span>{" "}
        ({range})
      </p>
      <Suspense fallback={null}>
        <SeasonScopeToggle availableSeasons={availableSeasons} />
      </Suspense>
    </div>
  );

  const tendenciesPanel = (
    <>
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
      <JsonLd
        data={researchHubDatasetJsonLd(
          dataLeague,
          findings.length,
          stats.meta.lastUpdated,
        )}
      />
      <ResearchHubFindings
        findings={findings}
        league={dataLeague}
        refCount={stats.refs.length}
      />
    </>
  );

  return (
    <div className="page-shell page-shell-insights">
      {showDataSourceBanner ? (
        <LeagueDataSourceBanner league={leagueId} meta={stats.meta} />
      ) : null}

      <LeagueHubTabs
        ariaLabel="Insights views"
        defaultTabId={defaultTab}
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
            note: (
              <>
                {RANKINGS_PAGE_LEAD} Sample: {stats.refs.length} officials (
                {range}).
              </>
            ),
            panel: tendenciesPanel,
          },
          {
            id: "trends",
            label: "Trends",
            note: (
              <>
                {scopeLabel} scoring and whistle baselines from game logs (
                {range}). Historical context only.
              </>
            ),
            panel: trendsPanel,
          },
          {
            id: "findings",
            label: "Findings",
            note: (
              <>
                {findings.length} findings ranked by effect size and sample size
                across {range}. Descriptive historical tendencies, not betting
                advice.
              </>
            ),
            panel: findingsPanel,
          },
        ]}
      />
    </div>
  );
}
