"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { RefAvatar } from "@/components/RefAvatar";
import { RefJerseyNumber } from "@/components/RefJerseyNumber";
import { signedDeltaTone } from "@/lib/metric-delight";
import { formatPct, formatSigned, bettingAtsRate, bettingOuRate } from "@/lib/stats-utils";
import { directoryScoringDisplay, prefersPctScoringDelta } from "@/lib/scoring-metrics";
import { qualifiedRefs, sortRefRankings, type RefRankingSort } from "@/lib/rankings";
import type { RefProfile } from "@/lib/types";

type SortField = "games" | "scoring" | "whistle" | "overRate" | "ats" | "ouBetting";

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

function deltaMetricClass(value: number | undefined): string {
  if (value === undefined) return "ranking-table-row-secondary-metric";
  const tone = signedDeltaTone(value);
  const base = "ranking-table-row-primary-metric";
  if (tone === "positive") return `${base} ranking-table-row-metric-positive`;
  if (tone === "negative") return `${base} ranking-table-row-metric-negative`;
  return base;
}

function DetailStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="ranking-table-details-stat">
      <span className="ranking-table-details-label">{label}</span>
      <span className="ranking-table-details-value">{value}</span>
    </div>
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
  atsAvailable = false,
  initialRowLimit = 5,
  defaultSort = "scoring-desc",
  filterSlugs,
  preserveOrder = false,
}: {
  refs: RefProfile[];
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  minSampleSize: number;
  overBaseline: number;
  leagueAvgTotal?: number;
  basePath?: string;
  signalCounts?: Record<string, number>;
  atsAvailable?: boolean;
  initialRowLimit?: number;
  defaultSort?: RefRankingSort;
  filterSlugs?: Set<string>;
  preserveOrder?: boolean;
}) {
  const [sort, setSort] = useState<RefRankingSort>(defaultSort);
  const [showLowSample, setShowLowSample] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSort(defaultSort);
    setShowAllRows(false);
  }, [defaultSort, filterSlugs, preserveOrder, refs]);

  const sorted = useMemo(() => {
    const pool = showLowSample ? refs : qualifiedRefs(refs, minSampleSize);
    const filtered =
      filterSlugs && filterSlugs.size > 0
        ? pool.filter((ref) => filterSlugs.has(ref.slug))
        : pool;
    if (preserveOrder) return filtered;
    return sortRefRankings(filtered, sort);
  }, [refs, sort, showLowSample, minSampleSize, filterSlugs, preserveOrder]);

  const visibleRows = showAllRows ? sorted : sorted.slice(0, initialRowLimit);
  const hiddenCount = Math.max(0, sorted.length - initialRowLimit);

  const isBasketball = league === "NBA" || league === "CBB";
  const scoringLabel = isBasketball
    ? "Scoring Δ"
    : league === "NFL"
      ? "Points Δ"
      : leagueAvgTotal && prefersPctScoringDelta(leagueAvgTotal)
        ? "vs avg"
        : "Goals Δ";
  const whistleLabel = isBasketball
    ? "Fouls Δ"
    : league === "NFL"
      ? "Flags Δ"
      : "Minors Δ";
  const sport =
    league === "NHL"
      ? "nhl"
      : league === "NFL"
        ? "nfl"
        : league === "CBB"
          ? "cbb"
          : league === "CFB"
            ? "cfb"
            : league === "EPL"
              ? "epl"
              : league === "LALIGA"
                ? "laliga"
                : "nba";
  const isNfl = league === "NFL";

  const handleSort = (field: SortField) => {
    setSort((current) => toggleSort(current, field));
  };

  const toggleExpanded = (slug: string) => {
    setExpandedSlugs((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div>
      <div className="ranking-toolbar">
        <div className="ranking-toolbar-row">
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
      </div>

      <div className="ranking-table-wrap overflow-x-auto">
        <table className="data-table ranking-table min-w-[640px]">
          <thead>
            <tr className="data-table-head">
              <th className="data-table-rank">#</th>
              <th className="ranking-table-row-expand" aria-label="Expand details">
                <span className="sr-only">Details</span>
              </th>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {visibleRows
              .filter((ref) => showLowSample || ref.games >= minSampleSize)
              .flatMap((ref, index) => {
              const rank = index + 1;
              const belowGate = ref.games < minSampleSize;

              const whistleDelta =
                league === "NHL"
                  ? ref.nhlAnalytics?.minorsDelta
                  : league === "NFL"
                    ? ref.nflAnalytics?.flagsDelta ?? ref.foulsDelta
                    : ref.foulsDelta;
              const yardsDelta = ref.nflAnalytics?.penaltyYardsDelta;
              const balance = ref.nflAnalytics?.balanceKind;
              const otRate = ref.nhlAnalytics?.overtimeRate;
              const profileHref = `${basePath}/refs/${ref.slug}`;
              const signalCount = signalCounts[ref.slug] ?? 0;
              const expanded = expandedSlugs.has(ref.slug);
              const scoringDisplay =
                leagueAvgTotal && prefersPctScoringDelta(leagueAvgTotal)
                  ? directoryScoringDisplay(ref, leagueAvgTotal).formatted
                  : formatSigned(ref.totalPointsDelta);
              const atsRate = bettingAtsRate(ref.bettingStats);
              const ouRate = bettingOuRate(ref.bettingStats);

              const rows: ReactNode[] = [
                <tr
                  key={ref.slug}
                  className={`ranking-table-row ${belowGate ? "ranking-table-row-thin" : ""}`}
                >
                  <td className="data-table-rank px-4 py-4 font-tabular tabular-nums text-zinc-400 sm:px-5">
                    {rank}
                  </td>
                  <td className="ranking-table-row-expand px-2 py-4">
                    <button
                      type="button"
                      className="ranking-table-expand-btn"
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Hide" : "Show"} details for ${ref.name}`}
                      onClick={() => toggleExpanded(ref.slug)}
                    >
                      <ChevronDown
                        className="h-4 w-4 transition-transform duration-150"
                        style={{ transform: expanded ? "rotate(180deg)" : undefined }}
                        aria-hidden
                      />
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2.5">
                      <RefAvatar
                        name={ref.name}
                        slug={ref.slug}
                        sport={sport}
                        size="sm"
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="min-w-0">
                          <Link
                            href={profileHref}
                            className="ranking-table-row-link font-medium text-zinc-900 hover:text-raptors hover:underline"
                          >
                            {ref.name}
                          </Link>
                          <RefJerseyNumber
                            number={ref.number}
                            className="ml-2 whitespace-nowrap font-tabular text-xs text-zinc-500"
                          />
                        </div>
                        <Link
                          href={profileHref}
                          className="ranking-table-row-profile-arrow"
                          aria-label={`Open ${ref.name} profile`}
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="data-table-num px-4 py-4 tabular-nums ranking-table-row-secondary-metric">
                    {ref.games.toLocaleString()}
                    {belowGate && (
                      <span className="ml-1 text-xs text-amber-700">· thin</span>
                    )}
                  </td>
                  <td className={`data-table-num px-4 py-4 ${deltaMetricClass(ref.totalPointsDelta)}`}>
                    {scoringDisplay}
                  </td>
                  <td className={`data-table-num px-4 py-4 ${deltaMetricClass(whistleDelta)}`}>
                    {whistleDelta !== undefined ? formatSigned(whistleDelta) : "-"}
                  </td>
                  <td className="data-table-num px-4 py-4 tabular-nums ranking-table-row-primary-metric">
                    {formatPct(ref.overRate)}
                  </td>
                </tr>,
              ];

              if (expanded) {
                rows.push(
                  <tr key={`${ref.slug}-details`} className="ranking-table-details-row">
                    <td colSpan={7}>
                      <div className="ranking-table-details-grid">
                        {atsAvailable ? (
                          <>
                            <DetailStat
                              label="Home ATS"
                              value={atsRate !== null ? formatPct(atsRate) : "-"}
                            />
                            <DetailStat
                              label="O/U hit %"
                              value={ouRate !== null ? formatPct(ouRate) : "-"}
                            />
                          </>
                        ) : null}
                        {signalCount > 0 ? (
                          <div className="ranking-table-details-stat">
                            <span className="ranking-table-details-label">Signals</span>
                            <Link
                              href={`${profileHref}#profile-signals`}
                              className="ranking-table-details-value ranking-signal-badge"
                            >
                              {signalCount} notable
                            </Link>
                          </div>
                        ) : null}
                        {league === "NHL" && (
                          <DetailStat
                            label="OT rate"
                            value={otRate !== undefined ? formatPct(otRate) : "-"}
                          />
                        )}
                        {isNfl && (
                          <>
                            <DetailStat
                              label="Yards Δ"
                              value={
                                yardsDelta !== undefined ? formatSigned(yardsDelta) : "-"
                              }
                            />
                            <DetailStat label="Balance" value={balance ?? "-"} />
                          </>
                        )}
                        <DetailStat
                          label="Profile"
                          value={
                            <Link
                              href={profileHref}
                              className="text-raptors hover:underline"
                            >
                              Full breakdown →
                            </Link>
                          }
                        />
                      </div>
                    </td>
                  </tr>,
                );
              }

              return rows;
            })}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 ? (
        <div className="ranking-table-expand-wrap">
          <button
            type="button"
            className="ranking-table-expand-btn rw-focus-ring"
            aria-expanded={showAllRows}
            onClick={() => setShowAllRows((current) => !current)}
          >
            {showAllRows
              ? "Show top rankings"
              : `View full rankings (${sorted.length})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
