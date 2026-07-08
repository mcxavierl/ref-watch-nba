import type { Metadata } from "next";
import Link from "next/link";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import { LeagueDataSourceBanner } from "@/components/LeagueDataSourceBanner";
import { formatRefStatsRange, getRefStats, getTeamSplits } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";
import { computeRefTeamMatrix, computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { absoluteUrl } from "@/lib/site";
import { NBA_TEAMS, teamFullName } from "@/lib/teams";
import { refTeamDataNote } from "@/lib/user-language";
import { getNbaTeamSosCache } from "@/lib/nba-team-sos-cache";

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
  const bbrTeamNote = refTeamDataNote(stats.meta);
  const league = LEAGUES.nba;

  const matrix = computeRefTeamMatrix(
    stats,
    NBA_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
      nbaId: team.nbaId,
    })),
    getTeamSplits,
    undefined,
    { league: "nba", sinceSeason: "2021-22" },
  );
  const extremes = computeMatrixExtremes(matrix);
  const teamSosByAbbr = getNbaTeamSosCache().teams;

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
          predictions; see{" "}
          <Link
            href="/methodology"
            className="font-medium text-zinc-800 hover:underline"
          >
            methodology
          </Link>
          .
        </p>
        {bbrTeamNote ? (
          <p className="mt-2 text-sm text-amber-800">{bbrTeamNote}</p>
        ) : seeded ? (
          <p className="mt-2 text-sm text-amber-800">
            Historical dataset; W-L derived from stored win rates and may
            round slightly.
          </p>
        ) : null}
      </section>

      <LeagueDataSourceBanner league="nba" meta={stats.meta} className="mb-4" />

      <section className="section-block">
        <div className="data-card overflow-hidden p-0">
          <RefTeamMatrix
            matrix={matrix}
            basePath={league.pathPrefix}
            leagueLabel={league.label}
            officialNounPlural={league.officialNounPlural}
            whistleDiffLabel={matrixWhistleDiffShortLabel(league.metrics)}
            sport="nba"
            teamSosByAbbr={teamSosByAbbr}
          />
        </div>
      </section>

      {extremes.length > 0 && (
        <section className="section-block">
          <h2 className="section-title">Standout ref×team splits</h2>
          <p className="section-lead">
            Cells where a team&apos;s win rate with that ref diverges sharply from
            their baseline in this sample. Descriptive only, not picks.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {extremes.map((item) => (
              <li key={`${item.refSlug}-${item.teamAbbr}`} className="data-card px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {item.kind === "high" ? "Above baseline" : "Below baseline"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  <Link
                    href={`${league.pathPrefix}/refs/${item.refSlug}#close-game`}
                    className="font-medium text-zinc-900 hover:text-raptors hover:underline"
                  >
                    {item.refName}
                  </Link>{" "}
                  with{" "}
                  <Link
                    href={`${league.pathPrefix}/teams/${item.teamAbbr}`}
                    className="font-medium text-zinc-900 hover:text-raptors hover:underline"
                  >
                    {item.teamLabel}
                  </Link>
                  : ref×team {item.wins}-{item.losses} ({formatPct(item.winRate)}) in{" "}
                  {item.games} games, {formatSigned(item.deltaPts)} vs team sample
                  baseline {item.baselineWins}-{item.baselineLosses} (
                  {formatPct(item.baselineWinRate)} across {item.baselineGames} gp).
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section-block">
        <h2 className="section-title">Related views</h2>
        <p className="section-lead">
          Compare recurring crews or browse ref profiles for tight-game proxies.
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <li>
            <Link href="/crews" className="text-zinc-800 hover:text-raptors hover:underline">
              Crew dynamics →
            </Link>
          </li>
          <li>
            <Link href="/refs" className="text-zinc-800 hover:text-raptors hover:underline">
              Ref profiles →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
