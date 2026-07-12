import Link from "next/link";
import { Suspense } from "react";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { MatrixExtremeSection } from "@/components/MatrixExtremeSection";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import {
  getRefStats,
  getTeamSplits,
} from "@/lib/nhl/data";
import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { hubPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = hubPageMetadata("nhl", "matrix");
import { nhlAnalyticsRefStats } from "@/lib/nhl/officials";
import { LEAGUES } from "@/lib/leagues";
import { computeRefTeamMatrix, computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { DEFAULT_SEASON_SCOPE_MODE, matrixLeadSeasonPhrase } from "@/lib/season-scope";
import { NHL_LINESMAN_METHODOLOGY_NOTE } from "@/lib/trust-charter";
import { NHL_TEAMS, teamFullName } from "@/lib/nhl/teams";

type PageProps = {
  searchParams: Promise<{ team?: string; ref?: string }>;
};

export default async function NhlMatrixPage({ searchParams }: PageProps) {
  await preloadLeagueRefStats(SITE_URL, "nhl", { includeTeamSplits: true });
  const { team, ref } = await searchParams;
  const stats = getRefStats();
  const analyticsStats = nhlAnalyticsRefStats(stats);
  const seasonSpan = matrixLeadSeasonPhrase(stats.meta.seasons.length);
  const league = LEAGUES.nhl;

  const matrix = computeRefTeamMatrix(
    analyticsStats,
    NHL_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
    })),
    getTeamSplits,
    undefined,
    { league: "nhl" },
  );
  const extremes = computeMatrixExtremes(matrix);

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="nhl">
        <Link href="/nhl" className="league-hub-hero-back">
          ← NHL slate
        </Link>
        <h1 className="page-title">NHL official × team matrix</h1>
        <p className="page-lead">
          Team W-L when each of {matrix.refs.length} referees worked their
          games ({seasonSpan}). Cells require {matrix.minGames}+ games in this
          dataset. {NHL_LINESMAN_METHODOLOGY_NOTE} Not predictions; see{" "}
          <Link href="/methodology" className="page-lead-link">
            methodology
          </Link>
          .
        </p>
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
              sport="nhl"
              siteUrl={SITE_URL}
              leagueId="nhl"
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
              href="/nhl/crews"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Crew dynamics →
            </Link>
          </li>
          <li>
            <Link
              href="/nhl/refs"
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
