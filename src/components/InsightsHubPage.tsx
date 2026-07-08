import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { LeagueDataSourceBanner } from "@/components/LeagueDataSourceBanner";
import { LeagueHubTabs } from "@/components/LeagueHubTabs";
import { LeagueTrendsTable } from "@/components/LeagueTrendsTable";
import { RankingsInsightCards } from "@/components/RankingsInsightCards";
import { RefRankingsTable } from "@/components/RefRankingsTable";
import { ResearchHubFindings } from "@/components/ResearchHubFindings";
import { getBaselinesFile } from "@/lib/baselines";
import { LEAGUES } from "@/lib/leagues";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { countNotableSignals } from "@/lib/profile-signals";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import { computeResearchFindingsForLeague } from "@/lib/research";
import { researchHubDatasetJsonLd } from "@/lib/syndication";
import { buildYoYNarrative, seasonRowsFromBaselines } from "@/lib/trends";
import { RANKINGS_PAGE_LEAD } from "@/lib/trust-charter";
import type { FindingLeague } from "@/lib/findings-shared";

type InsightsLeagueId = "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";

type InsightsHubPageProps = {
  leagueId: InsightsLeagueId;
  defaultTab?: "tendencies" | "trends" | "findings";
};

function insightsDataLeague(leagueId: InsightsLeagueId): FindingLeague {
  return LEAGUES[leagueId].dataLeague as FindingLeague;
}

export function InsightsHubPage({
  leagueId,
  defaultTab = "tendencies",
}: InsightsHubPageProps) {
  const league = LEAGUES[leagueId];
  const { stats, formatRange } = loadLeagueStats(leagueId);
  const range = formatRange(stats.meta);
  const homeHref = league.pathPrefix || "/";
  const dataLeague = insightsDataLeague(leagueId);
  const findings = computeResearchFindingsForLeague(dataLeague);
  const baselines = getBaselinesFile();
  const rows = seasonRowsFromBaselines(baselines[dataLeague].seasons);
  const narrative = buildYoYNarrative(rows, dataLeague);
  const synthesis = buildRankingsSynthesis(stats, league);
  const signalCounts = Object.fromEntries(
    stats.refs.map((ref) => [
      ref.slug,
      countNotableSignals(ref, stats.meta, leagueId),
    ]),
  );

  const tendenciesPanel = (
    <>
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
      <p className="section-lead mb-4">
        Five-season scoring and whistle baselines from game logs ({range}).
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

      <LeagueDataSourceBanner league={leagueId} meta={stats.meta} />

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
