import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { Suspense } from "react";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import {
  RefTeamMatrixSkeleton,
  SeasonScopeToggleSkeleton,
} from "@/components/LayoutShiftSkeletons";
import { MatrixExtremeSection } from "@/components/MatrixExtremeSection";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { getTeamSplits } from "@/lib/wnba/data";
import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { hydrateScopedGameLogs } from "@/lib/scoped-game-log-hydrate";
import { LEAGUES } from "@/lib/leagues";
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import { statsForMatrixPage } from "@/lib/matrix-page-stats";
import { computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { matrixLeadSeasonPhrase, readSeasonScopeParam } from "@/lib/season-scope";
import { WNBA_TEAMS, teamFullName } from "@/lib/wnba/teams";
import { refTeamDataNote } from "@/lib/user-language";
import { hubPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = hubPageMetadata("wnba", "matrix");

type PageProps = {
  searchParams: Promise<{ scope?: string; team?: string; ref?: string }>;
};

export default async function WnbaMatrixPage({ searchParams }: PageProps) {
  const { scope, team, ref } = await searchParams;
  const scopeMode = readSeasonScopeParam(scope);
  await preloadLeagueRefStats(SITE_URL, "wnba", { includeTeamSplits: true });
  await hydrateScopedGameLogs(SITE_URL, "wnba", scopeMode);
  const {
    stats,
    sinceSeason,
    scopeLabel,
    scopedSeasons,
  } = loadScopedLeagueStats("wnba", scopeMode);
  const statsForMatrix = await statsForMatrixPage("wnba", stats, scopedSeasons);
  const seasonSpan = matrixLeadSeasonPhrase(scopedSeasons.length);
  const bbrTeamNote = refTeamDataNote(stats.meta);
  const league = LEAGUES.wnba;

  const matrix = computeRefTeamMatrix(
    statsForMatrix,
    WNBA_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
    })),
    getTeamSplits,
    undefined,
    { league: "wnba", sinceSeason },
  );
  const extremes = computeMatrixExtremes(matrix);

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="wnba">
        <Link href="/wnba" className="league-hub-hero-back">
          ← WNBA slate
        </Link>
        <h1 className="page-title">WNBA ref × team matrix</h1>
        <p className="page-lead">
          Team W-L when each of {matrix.refs.length} referees worked their games
          ({seasonSpan}). Cells require {matrix.minGames}+ games in this dataset. Not
          predictions; see{" "}
          <Link href="/methodology" className="page-lead-link">
            methodology
          </Link>
          .
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">{scopeLabel}</p>
          <Suspense fallback={<SeasonScopeToggleSkeleton />}>
            <SeasonScopeToggle />
          </Suspense>
        </div>
        {bbrTeamNote ? (
          <p className="text-sm text-amber-300/90">{bbrTeamNote}</p>
        ) : null}
      </LeagueHubHero>

      <section className="section-block">
        <div className="data-card overflow-hidden p-0">
          <Suspense fallback={<RefTeamMatrixSkeleton refCount={matrix.refs.length} />}>
            <RefTeamMatrix
              matrix={matrix}
              basePath={league.pathPrefix}
              leagueLabel={league.label}
              officialNounPlural={league.officialNounPlural}
              whistleDiffLabel={matrixWhistleDiffShortLabel(league.metrics)}
              sport="wnba"
              siteUrl={SITE_URL}
              leagueId="wnba"
              scopeMode={scopeMode}
              scopeLabel={scopeLabel}
              initialTeamAbbr={team}
              initialRefSlug={ref}
            />
          </Suspense>
        </div>
      </section>

      <MatrixExtremeSection
        extremes={extremes}
        basePath={league.pathPrefix}
        leagueId="wnba"
        title="Standout ref×team splits"
        lead="Cells where a team's win rate with that ref diverges sharply from their baseline in this sample. Descriptive only, not picks."
      />

      <section className="section-block">
        <h2 className="section-title">Related views</h2>
        <p className="section-lead">
          Browse ref profiles or compare officials side by side.
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <li>
            <Link href="/wnba/refs" className="text-zinc-800 hover:text-raptors hover:underline">
              Ref profiles →
            </Link>
          </li>
          <li>
            <Link href="/compare" className="text-zinc-800 hover:text-raptors hover:underline">
              Compare officials →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
