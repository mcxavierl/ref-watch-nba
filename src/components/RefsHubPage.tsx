import Link from "next/link";
import { Suspense } from "react";
import {
  LeagueHubHero,
  type HubHeroLeagueId,
} from "@/components/LeagueHubHero";
import { RefsDirectory } from "@/components/RefsDirectory";
import { RefsMacroInsight } from "@/components/RefsMacroInsight";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { SeasonScopeToggleSkeleton } from "@/components/LayoutShiftSkeletons";
import { leagueGamesHubBackLabel, leagueHubHref, LEAGUES } from "@/lib/leagues";
import { loadHubLeagueStats } from "@/lib/load-league-stats";
import { buildRefsDirectoryContext } from "@/lib/refs-directory";
import {
  defaultSeasonScopeForLeague,
  formatDatingBackPhrase,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import { NHL_LINESMAN_METHODOLOGY_NOTE } from "@/lib/trust-charter";

type RefsHubPageProps = {
  leagueId: HubHeroLeagueId;
  scopeMode?: SeasonScopeMode;
};

export function RefsHubPage({
  leagueId,
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

  const scopeToolbar = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-zinc-600">
        {scopeLabel} ({range})
      </p>
      <Suspense fallback={<SeasonScopeToggleSkeleton />}>
        <SeasonScopeToggle leagueId={leagueId} availableSeasons={availableSeasons} />
      </Suspense>
    </div>
  );

  const historyPhrase = formatDatingBackPhrase(ctx.meta.seasons);
  const refsLead =
    leagueId === "nhl"
      ? `${ctx.meta.qualifiedCount} referees with game history ${historyPhrase}. ${NHL_LINESMAN_METHODOLOGY_NOTE}`
      : `${ctx.meta.qualifiedCount} ${league.officialNounPlural} with game history ${historyPhrase}.`;

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId={leagueId}>
        <Link href={homeHref} className="league-hub-hero-back">
          ← {leagueGamesHubBackLabel(leagueId)}
        </Link>
        <h1 className="page-title">
          {leagueId === "nhl"
            ? "Officials"
            : `${league.officialNounPlural.charAt(0).toUpperCase()}${league.officialNounPlural.slice(1)}`}
        </h1>
        <p className="page-lead">{refsLead}</p>
      </LeagueHubHero>

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
    </div>
  );
}
