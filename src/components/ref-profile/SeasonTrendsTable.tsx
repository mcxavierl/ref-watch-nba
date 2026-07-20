import type { SeasonTrendRow } from "@/lib/ref-profile-season-trends";
import {
  archetypeChipClass,
  INSUFFICIENT_SEASON_SAMPLE_GAMES,
} from "@/lib/ref-profile-season-trends";

export function SeasonTrendsTable({ rows }: { rows: SeasonTrendRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="ref-season-trends-empty text-sm text-primary-muted">
        No season trend data is available for this official yet.
      </p>
    );
  }

  return (
    <div className="ref-season-trends-table-wrap ref-table-scroll">
      <table className="ref-data-table data-table ref-season-trends-table ref-profile-fluid-table min-w-[31.25rem] w-full">
        <thead className="data-table-head">
          <tr>
            <th scope="col" className="whitespace-nowrap">
              Season
            </th>
            <th scope="col" className="whitespace-nowrap">
              Archetype
            </th>
            <th scope="col" className="data-table-num whitespace-nowrap">
              Foul_Ratio
            </th>
            <th scope="col" className="data-table-num whitespace-nowrap">
              Leverage_Sensitivity
            </th>
            <th scope="col" className="data-table-num whitespace-nowrap">
              Consistency
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.kind === "insufficient" ? (
              <tr
                key={row.season}
                className="ref-season-trends-row ref-season-trends-row--insufficient"
              >
                <td className="tabular-nums">{row.season}</td>
                <td colSpan={4}>
                  <span className="ref-season-trends-insufficient-copy">
                    Insufficient data ({row.sampleGames} games, fewer than{" "}
                    {INSUFFICIENT_SEASON_SAMPLE_GAMES} required)
                  </span>
                </td>
              </tr>
            ) : (
              <tr key={row.season} className="ref-season-trends-row">
                <td className="tabular-nums">{row.season}</td>
                <td>
                  <span
                    className={`ref-season-trends-chip tabular-nums ${archetypeChipClass(row.archetype)}`}
                  >
                    {row.archetypeLabel}
                  </span>
                </td>
                <td className="data-table-num whitespace-nowrap tabular-nums">{row.foulRatio.toFixed(2)}</td>
                <td className="data-table-num whitespace-nowrap tabular-nums">{row.leverageSensitivity}</td>
                <td className="data-table-num whitespace-nowrap tabular-nums">
                  {row.consistencyIndex !== null
                    ? `${row.consistencyIndex}/100`
                    : `${row.consistency}/10`}
                  <span className="block text-xs text-primary-muted">
                    {row.consistencyClassification}
                  </span>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
