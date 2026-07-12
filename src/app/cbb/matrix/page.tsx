import Link from "next/link";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { MatrixExtremeSection } from "@/components/MatrixExtremeSection";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import { formatRefStatsRange, getRefStats, getTeamSplits } from "@/lib/cbb/data";
import { LEAGUES } from "@/lib/leagues";
import { computeRefTeamMatrix, computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { CBB_TEAMS, teamFullName } from "@/lib/cbb/teams";
import { refTeamDataNote } from "@/lib/user-language";
import { hubPageMetadata } from "@/lib/seo";
export const metadata = hubPageMetadata("cbb", "matrix");


export default function NbaMatrixPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = stats.meta.source === "seeded";
  const bbrTeamNote = refTeamDataNote(stats.meta);
  const league = LEAGUES.cbb;

  const matrix = computeRefTeamMatrix(
    stats,
    CBB_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
    })),
    getTeamSplits,
    undefined,
    { league: "cbb", sinceSeason: "2021-22" },
  );
  const extremes = computeMatrixExtremes(matrix);

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="cbb">
        <Link href="/cbb" className="league-hub-hero-back">
          ← Home
        </Link>
        <h1 className="page-title">CBB ref × team matrix</h1>
        <p className="page-lead">
          Team W-L when each of {matrix.refs.length} referees worked their games
          ({range}). Cells require {matrix.minGames}+ games in this dataset. Not
          predictions; see{" "}
          <Link href="/methodology" className="page-lead-link">
            methodology
          </Link>
          .
        </p>
        {bbrTeamNote ? (
          <p className="text-sm text-amber-300/90">{bbrTeamNote}</p>
        ) : seeded ? (
          <p className="text-sm text-amber-300/90">
            Historical dataset; W-L derived from stored win rates and may
            round slightly.
          </p>
        ) : null}
      </LeagueHubHero>

      <section className="section-block">
        <div className="data-card overflow-hidden p-0">
          <RefTeamMatrix
            matrix={matrix}
            basePath={league.pathPrefix}
            leagueLabel={league.label}
            officialNounPlural={league.officialNounPlural}
            whistleDiffLabel={matrixWhistleDiffShortLabel(league.metrics)}
            sport="cbb"
          />
        </div>
      </section>

      <MatrixExtremeSection
        extremes={extremes}
        basePath={league.pathPrefix}
        title="Standout ref×team splits"
        lead="Cells where a team's win rate with that ref diverges sharply from their baseline in this sample. Descriptive only, not picks."
      />

      <section className="section-block">
        <h2 className="section-title">Related views</h2>
        <p className="section-lead">
          Compare recurring crews or browse ref profiles for tight-game proxies.
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <li>
            <Link href="/cbb/crews" className="text-zinc-800 hover:text-raptors hover:underline">
              Crew dynamics →
            </Link>
          </li>
          <li>
            <Link href="/cbb/refs" className="text-zinc-800 hover:text-raptors hover:underline">
              Ref profiles →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
