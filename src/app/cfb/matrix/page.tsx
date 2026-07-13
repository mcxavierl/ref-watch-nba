import Link from "next/link";
import { Suspense } from "react";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { MatrixExtremeSection } from "@/components/MatrixExtremeSection";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import {
  getRefStats,
  getTeamSplits,
} from "@/lib/cfb/data";
import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { hubPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = hubPageMetadata("cfb", "matrix");
import { LEAGUES } from "@/lib/leagues";
import { computeRefTeamMatrix, computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { DEFAULT_SEASON_SCOPE_MODE, matrixLeadSeasonPhrase } from "@/lib/season-scope";
import { isCfbSimulatedData } from "@/lib/cfb/data-source";
import { CFB_TEAMS, teamFullName } from "@/lib/cfb/teams";

type PageProps = {
  searchParams: Promise<{ team?: string; ref?: string }>;
};

export default async function CfbMatrixPage({ searchParams }: PageProps) {
  await preloadLeagueRefStats(SITE_URL, "cfb", { includeTeamSplits: true });
  const { team, ref } = await searchParams;
  const stats = getRefStats();
  const seasonSpan = matrixLeadSeasonPhrase(stats.meta.seasons.length);
  const seeded = isCfbSimulatedData(stats.meta.source);
  const espn = stats.meta.source === "espn";
  const league = LEAGUES.cfb;

  const matrix = computeRefTeamMatrix(
    stats,
    CFB_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
    })),
    getTeamSplits,
    undefined,
    { league: "cfb" },
  );
  const extremes = computeMatrixExtremes(matrix);

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="cfb">
        <Link href="/cfb" className="league-hub-hero-back">
          ← CFB slate
        </Link>
        <h1 className="page-title">CFB official × team matrix</h1>
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
            Simulated seed dataset; W-L derived from stored win rates and may
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
          <Suspense fallback={null}>
            <RefTeamMatrix
              matrix={matrix}
              basePath={league.pathPrefix}
              leagueLabel={league.label}
              officialNounPlural={league.officialNounPlural}
              whistleDiffLabel={matrixWhistleDiffShortLabel(league.metrics)}
              sport="cfb"
              siteUrl={SITE_URL}
              leagueId="cfb"
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
        title="Standout official×team splits"
        lead="Cells where a team's win rate with that official diverges sharply from their baseline in this sample. Descriptive only, not picks."
        entityLabel="official"
      />

      <section className="section-block">
        <h2 className="section-title">Related views</h2>
        <p className="section-lead">
          Compare recurring crews or browse official profiles for late-game
          proxies.
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <li>
            <Link
              href="/cfb/crews"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Crew dynamics →
            </Link>
          </li>
          <li>
            <Link
              href="/cfb/refs"
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
