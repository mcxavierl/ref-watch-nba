import Link from "next/link";
import { Suspense } from "react";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { MatrixExtremeSection } from "@/components/MatrixExtremeSection";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { getTeamSplits } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import { computeRefTeamMatrix, computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { matrixLeadSeasonPhrase, readSeasonScopeParam } from "@/lib/season-scope";
import { NBA_TEAMS, teamFullName } from "@/lib/teams";
import { refTeamDataNote } from "@/lib/user-language";
import { getNbaTeamSosCache } from "@/lib/nba-team-sos-cache";
import { hubPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = hubPageMetadata("nba", "matrix");

type PageProps = {
  searchParams: Promise<{ scope?: string; team?: string; ref?: string }>;
};

export default async function NbaMatrixPage({ searchParams }: PageProps) {
  const { scope, team, ref } = await searchParams;
  const scopeMode = readSeasonScopeParam(scope);
  const {
    stats,
    sinceSeason,
    scopeLabel,
    scopedSeasons,
  } = loadScopedLeagueStats("nba", scopeMode);
  const seasonSpan = matrixLeadSeasonPhrase(scopedSeasons.length);
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
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="nba">
        <Link href="/" className="league-hub-hero-back">
          ← Home
        </Link>
        <h1 className="page-title">NBA ref × team matrix</h1>
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
          <Suspense fallback={null}>
            <SeasonScopeToggle />
          </Suspense>
        </div>
        {bbrTeamNote ? (
          <p className="text-sm text-amber-300/90">{bbrTeamNote}</p>
        ) : null}
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
              sport="nba"
              teamSosByAbbr={teamSosByAbbr}
              siteUrl={SITE_URL}
              leagueId="nba"
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
            <Link href="/crews" className="text-zinc-800 hover:text-raptors hover:underline">
              Crew dynamics →
            </Link>
          </li>
          <li>
            <Link href="/refs" className="text-zinc-800 hover:text-raptors hover:underline">
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
