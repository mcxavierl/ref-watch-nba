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
import { statsForMatrixPage } from "@/lib/matrix-page-stats";
import {
  computeMatrixExtremes,
  matrixWhistleDiffShortLabel,
  type MatrixViewMode,
} from "@/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { readSeasonScopeParam } from "@/lib/season-scope";
import { NFL_TEAMS, teamFullName } from "@/lib/nfl/teams";
import "@/components/matrix-hub.css";

type PageProps = {
  searchParams: Promise<{ scope?: string; team?: string; ref?: string; mode?: string }>;
};

function readMatrixViewModeParam(mode?: string): MatrixViewMode {
  return mode === "ats" ? "ats" : "wl";
}

export const dynamic = "force-dynamic";

export default async function NflMatrixPage({ searchParams }: PageProps) {
  await preloadLeagueRefStats(SITE_URL, "nfl", { includeTeamSplits: true });
  const { scope, team, ref, mode } = await searchParams;
  const scopeMode = readSeasonScopeParam(scope);
  const initialViewMode = readMatrixViewModeParam(mode);
  const {
    stats,
    sinceSeason,
    scopedSeasons,
    availableSeasons,
  } = loadScopedLeagueStats("nfl", scopeMode);
  const statsForMatrix = await statsForMatrixPage("nfl", stats, scopedSeasons);
  const league = LEAGUES.nfl;

  const matrix = computeRefTeamMatrix(
    statsForMatrix,
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

  const footerProvenanceNote =
    stats.meta.source === "hybrid"
      ? "Ref×team W-L rebuilt from ESPN game logs; penalty and scoring splits merged where available."
      : stats.meta.source === "espn"
        ? "Penalty and scoring stats sourced from ESPN game summaries."
        : undefined;

  return (
    <div className="page-shell page-shell-hub page-shell-matrix-first">
      <LeagueHubHero
        leagueId="nfl"
        className="league-hub-hero--matrix-first"
        aria-labelledby="nfl-matrix-heading"
      >
        <h1 className="page-title" id="nfl-matrix-heading">
          NFL official × team matrix
        </h1>
        <div className="league-matrix-hero-scope">
          <Suspense fallback={null}>
            <SeasonScopeToggle availableSeasons={availableSeasons} />
          </Suspense>
        </div>
      </LeagueHubHero>

      <section className="section-block section-block--matrix-first">
        <div className="data-card overflow-hidden p-0">
          <Suspense fallback={null}>
            <RefTeamMatrix
              matrix={matrix}
              basePath={league.pathPrefix}
              leagueLabel={league.label}
              officialNounPlural={league.officialNounPlural}
              whistleDiffLabel={matrixWhistleDiffShortLabel(league.metrics)}
              sport="nfl"
              siteUrl={SITE_URL}
              leagueId="nfl"
              scopeMode={scopeMode}
              scopeLabel={scopedSeasons.length > 0 ? `${scopedSeasons.length} seasons` : "All seasons"}
              initialTeamAbbr={team}
              initialRefSlug={ref}
              atsAvailable={stats.meta.atsAvailable === true}
              initialViewMode={initialViewMode}
              layout="matrix-first"
              footerProvenanceNote={footerProvenanceNote}
            />
          </Suspense>
        </div>
      </section>

      <MatrixExtremeSection
        extremes={extremes}
        basePath={league.pathPrefix}
        leagueId="nfl"
        title="Standout official×team splits"
        lead="Cells where a team's win rate with that official diverges sharply from their baseline in this sample. Descriptive only, not picks."
        entityLabel="official"
      />
    </div>
  );
}
