"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { RefAvatar } from "@/components/RefAvatar";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { directoryScoringDisplay, prefersPctScoringDelta } from "@/lib/scoring-metrics";
import { qualifiedRefs, sortRefRankings, type RefRankingSort } from "@/lib/rankings";
import type { RefProfile } from "@/lib/types";

type SortField = "games" | "scoring" | "whistle" | "overRate";

function toggleSort(current: RefRankingSort, field: SortField): RefRankingSort {
  const [activeField, direction] = current.split("-") as [string, "asc" | "desc"];
  if (activeField === field) {
    return `${field}-${direction === "desc" ? "asc" : "desc"}` as RefRankingSort;
  }
  return `${field}-desc` as RefRankingSort;
}

function SortableHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SortField;
  sort: RefRankingSort;
  onSort: (field: SortField) => void;
}) {
  const [activeField, direction] = sort.split("-") as [string, "asc" | "desc"];
  const isActive = activeField === field;

  return (
    <th
      className="data-table-num"
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`ranking-sort-btn ${isActive ? "ranking-sort-btn-active" : ""}`}
      >
        <span>{label}</span>
        <span className="ranking-sort-arrow" aria-hidden="true">
          {isActive ? (direction === "desc" ? "↓" : "↑") : "↕"}
        </span>
      </button>
    </th>
  );
}

export function RefRankingsTable({
  refs,
  league,
  minSampleSize,
  overBaseline,
  leagueAvgTotal,
  basePath = "",
  signalCounts = {},
}: {
  refs: RefProfile[];
  league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";
  minSampleSize: number;
  overBaseline: number;
  leagueAvgTotal?: number;
  basePath?: string;
  signalCounts?: Record<string, number>;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<RefRankingSort>("scoring-desc");
  const [showLowSample, setShowLowSample] = useState(false);

  const sorted = useMemo(
    () =>
      sortRefRankings(
        showLowSample ? refs : qualifiedRefs(refs, minSampleSize),
        sort,
      ),
    [refs, sort, showLowSample, minSampleSize],
  );

  const scoringLabel =
    league === "NBA"
      ? "Scoring Δ"
      : league === "NFL"
        ? "Points Δ"
        : leagueAvgTotal && prefersPctScoringDelta(leagueAvgTotal)
          ? "vs avg"
          : "Goals Δ";
  const whistleLabel =
    league === "NBA" ? "Fouls Δ" : league === "NFL" ? "Flags Δ" : "Minors Δ";
  const unit =
    league === "NBA" ? "points" : league === "NFL" ? "points" : "goals";
  const sport =
    league === "NHL" ? "nhl" : league === "NFL" ? "nfl" : "nba";
  const isNfl = league === "NFL";

  const handleSort = (field: SortField) => {
    setSort((current) => toggleSort(current, field));
  };

  return (
    <div>
      <div className="ranking-toolbar">
        <div className="ranking-toolbar-row">
          <p className="ranking-toolbar-hint">
            Click column headers to sort. Historical tendencies vs league baseline,
            descriptive only, not picks.
          </p>
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
        <p className="ranking-toolbar-context">
          Over rate uses {overBaseline} combined {unit} benchmark.
        </p>
      </div>

      <div className="ranking-table-wrap overflow-x-auto">
        <table className="data-table ranking-table min-w-[640px]">
          <thead>
            <tr className="data-table-head">
              <th className="data-table-rank">#</th>
              <th>Official</th>
              <SortableHeader label="Games" field="games" sort={sort} onSort={handleSort} />
              <SortableHeader
                label={scoringLabel}
                field="scoring"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label={whistleLabel}
                field="whistle"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="Over rate"
                field="overRate"
                sort={sort}
                onSort={handleSort}
              />
              <th>Signals</th>
              {league === "NHL" && <th className="data-table-num">OT rate</th>}
              {isNfl && <th className="data-table-num">Yards Δ</th>}
              {isNfl && <th>Balance</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {sorted.reduce<ReactNode[]>((rows, ref) => {
              const belowGate = ref.games < minSampleSize;
              if (belowGate && !showLowSample) return rows;

              const whistleDelta =
                league === "NHL"
                  ? ref.nhlAnalytics?.minorsDelta
                  : league === "NFL"
                    ? ref.nflAnalytics?.flagsDelta ?? ref.foulsDelta
                    : ref.foulsDelta;
              const yardsDelta = ref.nflAnalytics?.penaltyYardsDelta;
              const balance = ref.nflAnalytics?.balanceKind;
              const otRate = ref.nhlAnalytics?.overtimeRate;
              const rank = rows.length + 1;
              const profileHref = `${basePath}/refs/${ref.slug}`;
              const signalCount = signalCounts[ref.slug] ?? 0;

              rows.push(
                <tr
                  key={ref.slug}
                  className={`ranking-table-row ${belowGate ? "ranking-table-row-thin" : ""}`}
                  onClick={() => router.push(profileHref)}
                >
                  <td className="data-table-rank px-4 py-3 font-mono tabular-nums text-zinc-400 sm:px-5">
                    {rank}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <RefAvatar
                        name={ref.name}
                        slug={ref.slug}
                        sport={sport}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          href={profileHref}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-zinc-900 hover:text-raptors hover:underline"
                        >
                          {ref.name}
                        </Link>
                        <span className="ml-2 whitespace-nowrap font-mono text-xs text-zinc-500">
                          #{ref.number}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-700">
                    {ref.games.toLocaleString()}
                    {belowGate && (
                      <span className="ml-1 text-xs text-amber-700">· thin</span>
                    )}
                  </td>
                  <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-800">
                    {leagueAvgTotal && prefersPctScoringDelta(leagueAvgTotal)
                      ? directoryScoringDisplay(ref, leagueAvgTotal).formatted
                      : formatSigned(ref.totalPointsDelta)}
                  </td>
                  <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-800">
                    {whistleDelta !== undefined ? formatSigned(whistleDelta) : "-"}
                  </td>
                  <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-800">
                    {formatPct(ref.overRate)}
                  </td>
                  <td className="px-4 py-3">
                    {signalCount > 0 ? (
                      <Link
                        href={`${profileHref}#profile-signals`}
                        onClick={(e) => e.stopPropagation()}
                        className="ranking-signal-badge shrink-0 whitespace-nowrap"
                      >
                        {signalCount} notable
                      </Link>
                    ) : null}
                  </td>
                  {league === "NHL" && (
                    <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-800">
                      {otRate !== undefined ? formatPct(otRate) : "-"}
                    </td>
                  )}
                  {isNfl && (
                    <td className="data-table-num px-4 py-3 font-mono tabular-nums text-zinc-800">
                      {yardsDelta !== undefined ? formatSigned(yardsDelta) : "-"}
                    </td>
                  )}
                  {isNfl && (
                    <td className="px-4 py-3 text-sm capitalize text-zinc-700">
                      {balance ?? "-"}
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
