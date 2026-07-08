import Link from "next/link";
import { Suspense } from "react";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { getTeamSplits } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import { computeRefTeamMatrix, computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { readSeasonScopeParam } from "@/lib/season-scope";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { NBA_TEAMS, teamFullName } from "@/lib/teams";
import { refTeamDataNote } from "@/lib/user-language";
import { getNbaTeamSosCache } from "@/lib/nba-team-sos-cache";
import { hubPageMetadata } from "@/lib/seo";

export const metadata = hubPageMetadata("nba", "matrix");

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function NbaMatrixPage({ searchParams }: PageProps) {
  const { scope } = await searchParams;
  const scopeMode = readSeasonScopeParam(scope);
  const {
    stats,
    formatRange,
    sinceSeason,
    scopeLabel,
  } = loadScopedLeagueStats("nba", scopeMode);
  const range = formatRange(stats.meta);
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
    { league: "nba", sinceSeason },
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-600">{scopeLabel}</p>
          <Suspense fallback={null}>
            <SeasonScopeToggle />
          </Suspense>
        </div>
        {bbrTeamNote ? (
          <p className="mt-2 text-sm text-amber-800">{bbrTeamNote}</p>
        ) : null}
      </section>

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
