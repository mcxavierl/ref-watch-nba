import Link from "next/link";
import { RefAvatar } from "@/components/RefAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import { winRateTone } from "@/lib/metricTone";
import {
  matrixCellExtreme,
  matrixCellKey,
  type RefTeamMatrix,
} from "@/lib/ref-team-matrix";
import { formatPct } from "@/lib/stats-utils";

type RefTeamMatrixProps = {
  matrix: RefTeamMatrix;
  basePath: string;
  leagueLabel: string;
  officialNounPlural: string;
  sport: "nba" | "nhl";
};

function cellToneClass(tone: "positive" | "negative" | "neutral"): string {
  switch (tone) {
    case "positive":
      return "ref-matrix-cell--positive";
    case "negative":
      return "ref-matrix-cell--negative";
    default:
      return "ref-matrix-cell--neutral";
  }
}

function extremeClass(extreme: "high" | "low" | null): string {
  if (extreme === "high") return "ref-matrix-cell--extreme-high";
  if (extreme === "low") return "ref-matrix-cell--extreme-low";
  return "";
}

export function RefTeamMatrix({
  matrix,
  basePath,
  leagueLabel,
  officialNounPlural,
  sport,
}: RefTeamMatrixProps) {
  const { refs, teams, cells, minGames, qualifiedCellCount } = matrix;
  const officialLabel =
    officialNounPlural.charAt(0).toUpperCase() + officialNounPlural.slice(1);

  return (
    <div className="ref-matrix">
      <div className="ref-matrix-legend" role="note">
        <p className="ref-matrix-legend-copy">
          Each cell shows a team&apos;s approximate W-L when that{" "}
          {officialNounPlural.slice(0, -1)} worked their games. Cells need{" "}
          {minGames}+ games; empty cells are below the sample gate. Colors
          compare win rate to the team&apos;s overall baseline; bold borders
          flag standout splits. Tap a cell for that ref&apos;s profile (including
          tight-game proxy). Historical splits only, not picks.
        </p>
        <div className="ref-matrix-legend-swatches" aria-hidden>
          <span className="ref-matrix-swatch ref-matrix-cell--positive">
            Above baseline
          </span>
          <span className="ref-matrix-swatch ref-matrix-cell--neutral">
            Near baseline
          </span>
          <span className="ref-matrix-swatch ref-matrix-cell--negative">
            Below baseline
          </span>
        </div>
        <p className="ref-matrix-meta">
          {refs.length} {officialNounPlural} × {teams.length} teams ·{" "}
          {qualifiedCellCount} qualified cells
        </p>
      </div>

      <p className="ref-matrix-mobile-hint sm:hidden">
        Scroll horizontally to compare all {leagueLabel} teams. Tap a cell to
        open that team&apos;s ref splits.
      </p>

      <div className="ref-matrix-wrap">
        <table className="ref-matrix-table">
          <thead>
            <tr>
              <th scope="col" className="ref-matrix-corner">
                {officialLabel}
              </th>
              {teams.map((team) => (
                <th key={team.abbr} scope="col" className="ref-matrix-team-head">
                  <Link
                    href={`${basePath}/teams/${team.abbr}`}
                    className="ref-matrix-team-link"
                    title={team.label}
                  >
                    <TeamLogo
                      team={{
                        abbr: team.abbr,
                        name: team.name,
                        nbaId: team.nbaId,
                      }}
                      sport={sport}
                      size="sm"
                      className="ref-matrix-team-logo"
                    />
                    <span className="ref-matrix-team-abbr">{team.abbr}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {refs.map((ref) => (
              <tr key={ref.slug}>
                <th scope="row" className="ref-matrix-ref-head">
                  <Link
                    href={`${basePath}/refs/${ref.slug}`}
                    className="ref-matrix-ref-link"
                    title={ref.name}
                  >
                    <RefAvatar
                      name={ref.name}
                      slug={ref.slug}
                      sport={sport}
                      size="sm"
                      className="ref-matrix-ref-avatar"
                    />
                    <span className="ref-matrix-ref-name">{ref.name}</span>
                  </Link>
                </th>
                {teams.map((team) => {
                  const cell = cells[matrixCellKey(ref.slug, team.abbr)];
                  if (!cell) {
                    return (
                      <td
                        key={team.abbr}
                        className="ref-matrix-cell ref-matrix-cell--empty"
                        aria-label={`${ref.name} vs ${team.abbr}: insufficient sample`}
                      >
                        <span aria-hidden>-</span>
                      </td>
                    );
                  }

                  const tone = winRateTone(cell.winRate, team.baselineWinRate);
                  const extreme = matrixCellExtreme(cell, team.baselineWinRate);
                  const record = `${cell.wins}-${cell.losses}`;
                  const title = `${ref.name} with ${team.label}: ${record} (${cell.games} gp, ${formatPct(cell.winRate)} win rate; team baseline ${formatPct(team.baselineWinRate)})`;

                  return (
                    <td
                      key={team.abbr}
                      className={`ref-matrix-cell ${cellToneClass(tone)} ${extremeClass(extreme)}`.trim()}
                    >
                      <Link
                        href={`${basePath}/refs/${ref.slug}#close-game`}
                        className="ref-matrix-cell-link"
                        title={title}
                        aria-label={title}
                      >
                        <span className="ref-matrix-record">{record}</span>
                        <span className="ref-matrix-games">{cell.games} gp</span>
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
