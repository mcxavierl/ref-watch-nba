import { LEAGUES, type LeagueId } from "@/lib/leagues";
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

export function LeagueTrendsTable({
  leagueId,
  rows,
}: {
  leagueId: LeagueId;
  rows: TrendRow[];
}) {
  const config = LEAGUES[leagueId];
  const showOtRate = config.showOtRate;
  const minWidth = showOtRate ? "min-w-[560px]" : "min-w-[480px]";

  return (
    <div className="data-card overflow-x-auto">
      <table className={`w-full ${minWidth} text-sm`}>
        <thead>
          <tr className="border-b border-border-subtle bg-surface-raised/60 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 sm:px-5">Season</th>
            <th className="px-4 py-3">{config.metrics.gamesColumn}</th>
            <th className="px-4 py-3">{scoringHeader(leagueId)}</th>
            <th className="px-4 py-3">{whistleHeader(leagueId)}</th>
            {showOtRate && <th className="px-4 py-3">OT rate</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row) => {
            const whistle = trendWhistleValue(row, leagueId);
            return (
              <tr key={row.season} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900 sm:px-5">
                  {row.season}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-zinc-700">
                  {row.gameCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                  {row.leagueAvgTotal}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                  {whistle !== undefined ? whistle : "-"}
                </td>
                {showOtRate && (
                  <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                    {row.leagueOvertimeRate !== undefined
                      ? formatPct(row.leagueOvertimeRate)
                      : "-"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
