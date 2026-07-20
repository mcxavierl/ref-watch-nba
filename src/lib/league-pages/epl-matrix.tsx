import Link from "next/link";
import { Suspense } from "react";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { RefTeamMatrixSkeleton } from "@/components/LayoutShiftSkeletons";
import { MatrixExtremeSection } from "@/components/MatrixExtremeSection";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import {
  getRefStats,
  getTeamSplits,
} from "@/lib/epl/data";
import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { hubPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = hubPageMetadata("epl", "matrix");
import { LEAGUES } from "@/lib/leagues";
import { computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { DEFAULT_SEASON_SCOPE_MODE, matrixLeadSeasonPhrase } from "@/lib/season-scope";
import { isEplSimulatedData } from "@/lib/epl/data-source";
import { EPL_TEAMS, teamFullName } from "@/lib/epl/teams";

type PageProps = {
  searchParams: Promise<{ team?: string; ref?: string }>;
};

export default async function EplMatrixPage({ searchParams }: PageProps) {
  await preloadLeagueRefStats(SITE_URL, "epl", { includeTeamSplits: true });
  const { team, ref } = await searchParams;
  const stats = getRefStats();
  const seasonSpan = matrixLeadSeasonPhrase(stats.meta.seasons.length);
  const seeded = isEplSimulatedData(stats.meta.source);
  const espn = stats.meta.source === "espn";
  const league = LEAGUES.epl;

  const matrix = computeRefTeamMatrix(
    stats,
    EPL_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
    })),
    getTeamSplits,
    undefined,
    { league: "epl" },
  );
  const extremes = computeMatrixExtremes(matrix);

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="epl">
        <Link href="/epl" className="league-hub-hero-back">
          ← EPL matchday
        </Link>
        <h1 className="page-title">EPL referee × team matrix</h1>
        <p className="page-lead">
          Team W-L when each of {matrix.refs.length} officials worked their
          games ({seasonSpan}). Cells require {matrix.minGames}+ games in this
          dataset. Not predictions; see{" "}
          <Link href="/methodology" className="page-lead-link">
            methodology
          </Link>
          .
        </p>
        {seeded && (
          <p className="text-sm text-amber-300/90">
            Preview seed dataset; W-L derived from stored win rates and may
            round slightly.
          </p>
        )}
        {espn && (
          <p className="text-sm text-emerald-300/90">
            Penalty and scoring stats sourced from ESPN game summaries.
          </p>
        )}
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
              sport="epl"
              siteUrl={SITE_URL}
              leagueId="epl"
              scopeMode={DEFAULT_SEASON_SCOPE_MODE}
              scopeLabel={seasonSpan}
              initialTeamAbbr={team}
              initialRefSlug={ref}
            />
          </Suspense>
        </div>
      </section>

      <MatrixExtremeSection
        extremes={extremes}
        basePath={league.pathPrefix}
        leagueId="epl"
        title="Standout official×team splits"
        lead="Cells where a team's win rate with that official diverges sharply from their baseline in this sample. Descriptive only, not picks."
        entityLabel="official"
      />

      <section className="section-block">
        <h2 className="section-title">Related views</h2>
        <p className="section-lead">
          Browse official profiles or compare officials side by side.
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <li>
            <Link
              href="/epl/refs"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Official profiles →
            </Link>
          </li>
          <li>
            <Link
              href="/compare"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Compare officials →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
