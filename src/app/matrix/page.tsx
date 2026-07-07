import type { Metadata } from "next";
import Link from "next/link";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import { formatRefStatsRange, getRefStats, getTeamSplits } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix";
import { absoluteUrl } from "@/lib/site";
import { NBA_TEAMS, teamFullName } from "@/lib/teams";

export const metadata: Metadata = {
  title: "NBA ref × team matrix",
  description:
    "Cross-tab matrix of NBA team records when each referee officiated their games. Minimum sample gates, descriptive historical splits only.",
  alternates: { canonical: absoluteUrl("/matrix") },
};

export default function NbaMatrixPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = stats.meta.source === "seeded";
  const league = LEAGUES.nba;

  const matrix = computeRefTeamMatrix(
    stats,
    NBA_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
    })),
    getTeamSplits,
  );

  return (
    <div className="page-shell">
      <Link href="/" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">NBA ref × team matrix</h1>
        <p className="page-lead">
          Team W-L when each of {matrix.refs.length} referees worked their games
          ({range}). Cells require {matrix.minGames}+ games in this dataset. Not
          predictions — see{" "}
          <Link
            href="/methodology"
            className="font-medium text-zinc-800 hover:underline"
          >
            methodology
          </Link>
          .
        </p>
        {seeded && (
          <p className="mt-2 text-sm text-amber-800">
            Historical dataset; W-L derived from stored win rates and may
            round slightly.
          </p>
        )}
      </section>

      <section className="section-block">
        <div className="data-card overflow-hidden p-0">
          <RefTeamMatrix
            matrix={matrix}
            basePath={league.pathPrefix}
            leagueLabel={league.label}
            officialNounPlural={league.officialNounPlural}
          />
        </div>
      </section>
    </div>
  );
}
