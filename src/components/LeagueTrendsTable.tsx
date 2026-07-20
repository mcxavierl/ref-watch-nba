import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatPct } from "@/lib/stats-utils";
import { trendWhistleValue, type TrendRow } from "@/lib/trends";

function scoringHeader(leagueId: LeagueId): string {
  if (leagueId === "nba" || leagueId === "cbb") return "Avg total pts";
  const unit = LEAGUES[leagueId].metrics.scoreUnitPlural;
  return `Avg ${unit}`;
}

function whistleHeader(leagueId: LeagueId): string {
  return `Avg ${LEAGUES[leagueId].metrics.whistleShort.toLowerCase()}`;
}

function formatWhistle(row: TrendRow, leagueId: LeagueId): string {
  const whistle = trendWhistleValue(row, leagueId);
  if (whistle !== undefined) return String(whistle);
  // Always show a whistle column value when the season row exists.
  return String(row.leagueAvgFouls);
}

export function LeagueTrendsTable({
  leagueId,
  rows,
}: {
  leagueId: LeagueId;
  rows: TrendRow[];
}) {
  const config = LEAGUES[leagueId];
  const showOtRate =
    config.showOtRate && rows.some((row) => row.leagueOvertimeRate !== undefined);
  const minWidth = showOtRate ? "min-w-[560px]" : "min-w-[480px]";

  if (rows.length === 0) {
    return (
      <div className="data-card px-4 py-5 sm:px-5">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="data-card overflow-x-auto stat-data-container master-table-scroll">
      <table className={`w-full ${minWidth} text-sm`}>
        <thead>
          <tr className="border-b border-border-subtle bg-surface-raised/60 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 sm:px-5">Season</th>
            <th className="data-table-num px-4 py-3 master-table-head-secondary">
              {config.metrics.gamesColumn}
            </th>
            <th className="data-table-num px-4 py-3">{scoringHeader(leagueId)}</th>
            <th className="data-table-num px-4 py-3 master-table-head-secondary">
              {whistleHeader(leagueId)}
            </th>
            {showOtRate && (
              <th className="data-table-num px-4 py-3 master-table-head-secondary">OT rate</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <tr key={row.season} className="hover:bg-zinc-50">
              <td className="px-4 py-3 font-medium text-zinc-900 sm:px-5">
                {row.season}
              </td>
              <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-700 master-table-metric-secondary">
                {row.gameCount.toLocaleString()}
              </td>
              <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-800">
                {row.leagueAvgTotal}
              </td>
              <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-800 master-table-metric-secondary">
                {formatWhistle(row, leagueId)}
              </td>
              {showOtRate && (
                <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-800 master-table-metric-secondary">
                  {row.leagueOvertimeRate !== undefined
                    ? formatPct(row.leagueOvertimeRate)
                    : formatPct(0)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
