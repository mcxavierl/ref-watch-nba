import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CrewDominanceTable } from "@/components/CrewDominanceTable";
import {
  LeagueHubHero,
  type HubHeroLeagueId,
} from "@/components/LeagueHubHero";
import { LeagueHubTabs } from "@/components/LeagueHubTabs";
import { RefsDirectory } from "@/components/RefsDirectory";
import { RefsMacroInsight } from "@/components/RefsMacroInsight";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import {
  computeCrewDominance,
  crewDominanceSummary,
} from "@/lib/crew-dominance";
import { leagueHubHref, LEAGUES } from "@/lib/leagues";
import { loadHubLeagueStats } from "@/lib/load-league-stats";
import { linesmanSlugSet } from "@/lib/nhl/officials";
import { buildRefsDirectoryContext } from "@/lib/refs-directory";
import {
  defaultSeasonScopeForLeague,
  formatDatingBackPhrase,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import { NHL_LINESMAN_METHODOLOGY_NOTE } from "@/lib/trust-charter";

type RefsHubPageProps = {
  leagueId: HubHeroLeagueId;
  defaultTab?: "refs" | "crews";
  scopeMode?: SeasonScopeMode;
};

export function RefsHubPage({
  leagueId,
  defaultTab = "refs",
  scopeMode = defaultSeasonScopeForLeague(leagueId),
}: RefsHubPageProps) {
  const league = LEAGUES[leagueId];
  const { stats, formatRange, scopeLabel, availableSeasons } = loadHubLeagueStats(
    leagueId,
    scopeMode,
  );
  const range = formatRange(stats.meta);
  const ctx = buildRefsDirectoryContext(stats, league);
  const homeHref = leagueHubHref(leagueId);
  const linesmen =
    leagueId === "nhl" ? linesmanSlugSet(stats.refs) : undefined;
  const seeded = stats.meta.source === "seeded";
  const activeView = defaultTab;

  const scopeToolbar = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-zinc-600">
        {scopeLabel} ({range})
      </p>
      <Suspense fallback={null}>
        <SeasonScopeToggle leagueId={leagueId} availableSeasons={availableSeasons} />
      </Suspense>
    </div>
  );

  const historyPhrase = formatDatingBackPhrase(ctx.meta.seasons);
  const refsLead =
    leagueId === "nhl"
      ? `${ctx.meta.qualifiedCount} referees with game history ${historyPhrase}. ${NHL_LINESMAN_METHODOLOGY_NOTE}`
      : `${ctx.meta.qualifiedCount} ${league.officialNounPlural} with game history ${historyPhrase}.`;

  let refsPanel: ReactNode = null;
  if (activeView === "refs") {
    refsPanel = (
      <>
        {scopeToolbar}
        <RefsMacroInsight meta={ctx.meta} league={league} scopeLabel={scopeLabel} />
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
  }

  let crewsPanel: ReactNode = null;
  if (activeView === "crews") {
    const entries = computeCrewDominance(stats);
    crewsPanel = (
      <section className="section-block">
        {scopeToolbar}
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
  }

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId={leagueId}>
        <Link href={homeHref} className="league-hub-hero-back">
          ← {league.shortLabel} slate
        </Link>
        <h1 className="page-title">
          {leagueId === "nhl"
            ? "Officials"
            : `${league.officialNounPlural.charAt(0).toUpperCase()}${league.officialNounPlural.slice(1)}`}
        </h1>
        <p className="page-lead">{refsLead}</p>
      </LeagueHubHero>

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
