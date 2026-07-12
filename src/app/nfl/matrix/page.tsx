import Link from "next/link";
import { Suspense } from "react";
import { LeagueHubHero } from "@/components/LeagueHubHero";
import { MatrixExtremeSection } from "@/components/MatrixExtremeSection";
import { RefTeamMatrix } from "@/components/RefTeamMatrix";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import {
  getTeamSplits,
} from "@/lib/nfl/data";
import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { hubPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = hubPageMetadata("nfl", "matrix");
import { LEAGUES } from "@/lib/leagues";
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import { computeRefTeamMatrix, computeMatrixExtremes, matrixWhistleDiffShortLabel } from "@/lib/ref-team-matrix";
import { matrixLeadSeasonPhrase, readSeasonScopeParam } from "@/lib/season-scope";
import { NFL_TEAMS, teamFullName } from "@/lib/nfl/teams";

type PageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export const dynamic = "force-dynamic";

export default async function NflMatrixPage({ searchParams }: PageProps) {
  await preloadLeagueRefStats(SITE_URL, "nfl");
  const { scope } = await searchParams;
  const scopeMode = readSeasonScopeParam(scope);
  const {
    stats,
    sinceSeason,
    scopeLabel,
    scopedSeasons,
    availableSeasons,
  } = loadScopedLeagueStats("nfl", scopeMode);
  const seasonSpan = matrixLeadSeasonPhrase(scopedSeasons.length);
  const espn = stats.meta.source === "espn" || stats.meta.source === "hybrid";
  const league = LEAGUES.nfl;

  const matrix = computeRefTeamMatrix(
    stats,
    NFL_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
    })),
    getTeamSplits,
    undefined,
    { league: "nfl", filterEmptyRows: true, sinceSeason },
  );
  const extremes = computeMatrixExtremes(matrix);

  return (
    <div className="page-shell page-shell-hub">
      <LeagueHubHero leagueId="nfl">
        <Link href="/nfl" className="league-hub-hero-back">
          ← NFL slate
        </Link>
        <h1 className="page-title">NFL official × team matrix</h1>
        <p className="page-lead">
          Team W-L when each of {matrix.refs.length} officials worked their
          games ({seasonSpan}). Cells require {matrix.minGames}+ games in this
          dataset. Not predictions; see{" "}
          <Link href="/methodology" className="page-lead-link">
            methodology
          </Link>
          .
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">{scopeLabel}</p>
          <Suspense fallback={null}>
            <SeasonScopeToggle availableSeasons={availableSeasons} />
          </Suspense>
        </div>
        {stats.meta.source === "hybrid" && (
          <p className="text-sm text-emerald-300/90">
            Ref×team W-L rebuilt from ESPN game logs; penalty and scoring splits
            merged where available.
          </p>
        )}
        {espn && stats.meta.source === "espn" && (
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
            sport="nfl"
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
              href="/nfl/crews"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Crew dynamics →
            </Link>
          </li>
          <li>
            <Link
              href="/nfl/refs"
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
