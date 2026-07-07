"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import {
  REF_RANKING_SORT_LABELS,
  sortRefRankings,
  type RefRankingSort,
} from "@/lib/rankings";
import type { RefProfile } from "@/lib/types";

export function RefRankingsTable({
  refs,
  league,
  minSampleSize,
  overBaseline,
  basePath = "",
  signalCounts = {},
}: {
  refs: RefProfile[];
  league: "NBA" | "NHL";
  minSampleSize: number;
  overBaseline: number;
  basePath?: string;
  signalCounts?: Record<string, number>;
}) {
  const [sort, setSort] = useState<RefRankingSort>("scoring-desc");
  const [showLowSample, setShowLowSample] = useState(false);

  const sorted = useMemo(() => sortRefRankings(refs, sort), [refs, sort]);

  const scoringLabel = league === "NBA" ? "Scoring Δ" : "Goals Δ";
  const whistleLabel = league === "NBA" ? "Fouls Δ" : "Minors Δ";

  return (
    <div>
      <div className="ranking-toolbar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="ref-rankings-sort" className="text-sm font-semibold text-zinc-900">
            Sort by
            <select
              id="ref-rankings-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as RefRankingSort)}
              className="ranking-select ml-2"
            >
              {Object.entries(REF_RANKING_SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="ranking-toggle">
            <input
              type="checkbox"
              checked={showLowSample}
              onChange={(e) => setShowLowSample(e.target.checked)}
              className="rounded border-border"
            />
            Show refs below {minSampleSize}-game gate
          </label>
        </div>
        <p className="section-lead">
          Historical tendencies vs league baseline — descriptive only, not picks.
          Over rate uses {overBaseline} combined {league === "NBA" ? "points" : "goals"} benchmark.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table min-w-[640px]">
          <thead>
            <tr className="data-table-head">
              <th>#</th>
              <th>Official</th>
              <th>Sample</th>
              <th>{scoringLabel}</th>
              <th>{whistleLabel}</th>
              <th>Over rate</th>
              <th>Signals</th>
              {league === "NHL" && <th>OT rate</th>}
            </tr>
          </thead>
            <tbody className="divide-y divide-border-subtle">
              {sorted.reduce<ReactNode[]>((rows, ref) => {
                const belowGate = ref.games < minSampleSize;
                if (belowGate && !showLowSample) return rows;

                const whistleDelta =
                  league === "NHL"
                    ? ref.nhlAnalytics?.minorsDelta
                    : ref.foulsDelta;
                const otRate = ref.nhlAnalytics?.overtimeRate;
                const rank = rows.length + 1;

                rows.push(
                  <tr
                    key={ref.slug}
                    className={`transition hover:bg-zinc-50 ${
                      belowGate ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-400 sm:px-5">
                      {rank}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/refs/${ref.slug}`}
                        className="font-medium text-zinc-900 hover:text-raptors hover:underline"
                      >
                        {ref.name}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-zinc-500">
                        #{ref.number}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-700">
                      {ref.games} gp
                      {belowGate && (
                        <span className="ml-1 text-xs text-amber-700">· thin</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                      {formatSigned(ref.totalPointsDelta)}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                      {whistleDelta !== undefined
                        ? formatSigned(whistleDelta)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                      {formatPct(ref.overRate)}
                    </td>
                    <td className="px-4 py-3">
                      {(signalCounts[ref.slug] ?? 0) > 0 ? (
                        <Link
                          href={`${basePath}/refs/${ref.slug}#profile-signals`}
                          className="text-sm font-medium text-zinc-800 hover:text-raptors hover:underline"
                        >
                          {signalCounts[ref.slug]} notable
                        </Link>
                      ) : (
                        <Link
                          href={`${basePath}/refs/${ref.slug}#profile-signals`}
                          className="text-sm text-zinc-500 hover:text-zinc-800 hover:underline"
                        >
                          View profile
                        </Link>
                      )}
                    </td>
                    {league === "NHL" && (
                      <td className="px-4 py-3 font-mono tabular-nums text-zinc-800">
                        {otRate !== undefined ? formatPct(otRate) : "—"}
                      </td>
                    )}
                  </tr>,
                );
                return rows;
              }, [])}
            </tbody>
          </table>
        </div>

      <div className="border-t border-border-subtle px-4 py-4 sm:px-5">
        <ProComingSoonTease league={league} compact />
      </div>
    </div>
  );
}
