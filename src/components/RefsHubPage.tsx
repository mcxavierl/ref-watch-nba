import Link from "next/link";
import { CrewDominanceTable } from "@/components/CrewDominanceTable";
import { LeagueHubTabs } from "@/components/LeagueHubTabs";
import { RefsDirectory } from "@/components/RefsDirectory";
import { RefsMacroInsight } from "@/components/RefsMacroInsight";
import {
  computeCrewDominance,
  crewDominanceSummary,
} from "@/lib/crew-dominance";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { linesmanSlugSet } from "@/lib/nhl/officials";
import { buildRefsDirectoryContext } from "@/lib/refs-directory";
import { NHL_LINESMAN_METHODOLOGY_NOTE } from "@/lib/trust-charter";

type RefsHubPageProps = {
  leagueId: LeagueId;
  defaultTab?: "refs" | "crews";
};

export function RefsHubPage({ leagueId, defaultTab = "refs" }: RefsHubPageProps) {
  const league = LEAGUES[leagueId];
  const { stats, formatRange } = loadLeagueStats(leagueId);
  const range = formatRange(stats.meta);
  const ctx = buildRefsDirectoryContext(stats, league);
  const entries = computeCrewDominance(stats);
  const homeHref = league.pathPrefix || "/";
  const linesmen =
    leagueId === "nhl" ? linesmanSlugSet(stats.refs) : undefined;
  const seeded = stats.meta.source === "seeded";

  const refsLead =
    leagueId === "nhl"
      ? `${ctx.meta.qualifiedCount} referees with game history across ${ctx.meta.seasons.join(", ")} (${range}). ${NHL_LINESMAN_METHODOLOGY_NOTE}`
      : `${ctx.meta.qualifiedCount} ${league.officialNounPlural} with game history across ${ctx.meta.seasons.join(", ")} (${range}).`;

  const refsPanel = (
    <>
      <RefsMacroInsight meta={ctx.meta} league={league} />
      <section className="section-block">
        <RefsDirectory
          refs={ctx.refs}
          meta={ctx.meta}
          league={league}
          basePath={league.pathPrefix}
        />
      </section>
    </>
  );

  const crewsPanel = (
    <section className="section-block">
      <p className="section-lead mb-4">
        {crewDominanceSummary(entries, leagueId)} ({range}). Pace and whistle
        deltas compare each crew to league baselines; dominance compares the
        crew to the same officials in other pairings.
      </p>
      {seeded && (
        <p className="mb-4 text-sm text-amber-800">
          Historical dataset aggregated from stored team crew splits.
        </p>
      )}
      <div className="data-card">
        <CrewDominanceTable
          entries={entries}
          basePath={league.pathPrefix}
          league={leagueId}
          overBaseline={stats.meta.leagueOverBaseline}
          leagueAvgFouls={stats.meta.leagueAvgFouls}
          linesmanSlugs={linesmen}
        />
      </div>
    </section>
  );

  return (
    <div className="page-shell">
      <Link href={homeHref} className="back-link">
        ← {league.shortLabel} slate
      </Link>

      <section className="page-hero">
        <h1 className="page-title">
          {leagueId === "nhl" ? "Officials" : `${league.officialNounPlural.charAt(0).toUpperCase()}${league.officialNounPlural.slice(1)}`}
        </h1>
        <p className="page-lead">{refsLead}</p>
      </section>

      <LeagueHubTabs
        ariaLabel="Officials views"
        defaultTabId={defaultTab}
        tabs={[
          { id: "refs", label: "Directory", panel: refsPanel },
          { id: "crews", label: "Crews", panel: crewsPanel },
        ]}
      />
    </div>
  );
}
