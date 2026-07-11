import Link from "next/link";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { MatrixExtremeSection } from "@/components/MatrixExtremeSection";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import {
  formatRefStatsRange,
  getRefStats,
  getTeamSplits,
} from "@/lib/laliga/data";
import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { hubPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = hubPageMetadata("laliga", "matrix");
import { LEAGUES } from "@/lib/leagues";
import { computeRefTeamMatrix, computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { isLaligaSimulatedData } from "@/lib/laliga/data-source";
import { LALIGA_TEAMS, teamFullName } from "@/lib/laliga/teams";

export default async function LaligaMatrixPage() {
  await preloadLeagueRefStats(SITE_URL, "laliga");
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = isLaligaSimulatedData(stats.meta.source);
  const espn = stats.meta.source === "espn";
  const league = LEAGUES.laliga;

  const matrix = computeRefTeamMatrix(
    stats,
    LALIGA_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
    })),
    getTeamSplits,
    undefined,
    { league: "laliga" },
  );
  const extremes = computeMatrixExtremes(matrix);

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="laliga">
        <Link href="/laliga" className="league-hub-hero-back">
          ← La Liga matchday
        </Link>
        <h1 className="page-title">La Liga referee × team matrix</h1>
        <p className="page-lead">
          Team W-L when each of {matrix.refs.length} officials worked their
          games ({range}). Cells require {matrix.minGames}+ games in this
          dataset. Not predictions; see{" "}
          <Link
            href="/methodology"
            className="font-medium text-zinc-200 hover:underline"
          >
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
          <RefTeamMatrix
            matrix={matrix}
            basePath={league.pathPrefix}
            leagueLabel={league.label}
            officialNounPlural={league.officialNounPlural}
            whistleDiffLabel={matrixWhistleDiffShortLabel(league.metrics)}
            sport="laliga"
          />
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
              href="/laliga/crews"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Crew dynamics →
            </Link>
          </li>
          <li>
            <Link
              href="/laliga/refs"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Official profiles →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
