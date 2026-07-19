"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { RefAvatar } from "@/components/RefAvatar";
import { RefJerseyNumber } from "@/components/RefJerseyNumber";
import { RankingSignalPill } from "@/components/RankingSignalPill";
import { StandoutMetricBar } from "@/components/StandoutMetric";
import {
  DataSufficiencyNotice,
  DataSufficiencyToggle,
} from "@/components/shared/DataSufficiencyNotice";
import { Pill } from "@/components/ui/Pill";
import {
  NO_ANOMALIES_DETECTED_COPY,
  qualifiesRefAnomaly,
  sortRefsByInterestingness,
} from "@/lib/anomaly-surface";
import { meetsDataSufficiency } from "@/lib/data-sufficiency";
import { useDataSufficiencyFilter } from "@/hooks/useDataSufficiencyFilter";
import { rankingInsightHeadline } from "@/lib/insight-headlines";
import type { LeagueId } from "@/lib/leagues";
import { signedDeltaTone } from "@/lib/metric-delight";
import { formatPct, formatSigned, bettingAtsRate, bettingOuRate } from "@/lib/stats-utils";
import { directoryScoringDisplay, prefersPctScoringDelta } from "@/lib/scoring-metrics";
import { sortRefRankings, type RefRankingSort } from "@/lib/rankings";
import type { RefProfile } from "@/lib/types";

type SortField = "games" | "scoring" | "whistle" | "overRate" | "ats" | "ouBetting";

const LEAGUE_ID_BY_LABEL: Record<
  "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB",
  LeagueId
> = {
  NBA: "nba",
  NHL: "nhl",
  NFL: "nfl",
  EPL: "epl",
  LALIGA: "laliga",
  CBB: "cbb",
  CFB: "cfb",
};

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
  const [showAllRows, setShowAllRows] = useState(false);
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(() => new Set());
  const leagueId = LEAGUE_ID_BY_LABEL[league];

  const meetsThreshold = useCallback(
    (ref: RefProfile) => meetsDataSufficiency(ref.games, minSampleSize),
    [minSampleSize],
  );

  useEffect(() => {
    setSort(defaultSort);
    setShowAllRows(false);
  }, [defaultSort, filterSlugs, preserveOrder, refs]);

  const sorted = useMemo(() => {
    const filteredBySlug =
      filterSlugs && filterSlugs.size > 0
        ? refs.filter((ref) => filterSlugs.has(ref.slug))
        : refs;
    const filtered = anomaliesOnly
      ? filteredBySlug.filter((ref) =>
          qualifiesRefAnomaly(ref, leagueId, signalCounts[ref.slug] ?? 0),
        )
      : filteredBySlug;
    if (preserveOrder) return filtered;
    if (anomaliesOnly) return sortRefsByInterestingness(filtered, leagueId);
    return sortRefRankings(filtered, sort);
  }, [
    refs,
    sort,
    filterSlugs,
    preserveOrder,
    anomaliesOnly,
    leagueId,
    signalCounts,
  ]);

  const sufficiency = useDataSufficiencyFilter(sorted, meetsThreshold);
  const visibleRows = showAllRows
    ? sufficiency.visible
    : sufficiency.visible.slice(0, initialRowLimit);
  const hiddenCount = Math.max(0, sufficiency.visible.length - initialRowLimit);

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
        <div className="ranking-toolbar-row flex flex-wrap items-center gap-3">
          <Pill
            as="button"
            variant="insight"
            active={anomaliesOnly}
            onClick={() => setAnomaliesOnly((current) => !current)}
            aria-pressed={anomaliesOnly}
          >
            Anomalies only
          </Pill>
        </div>
        <DataSufficiencyNotice
          showAll={sufficiency.showAll}
          hiddenCount={sufficiency.hiddenCount}
          onExpand={sufficiency.expandList}
          className="ranking-toolbar-context"
        />
      </div>

      {sufficiency.visible.length === 0 ? (
        <p className="overview-slate-empty overview-slate-empty-panel">{NO_ANOMALIES_DETECTED_COPY}</p>
      ) : (
        <>
      <div className="ranking-mobile-list md:hidden">
        {visibleRows.map((ref) => {
          const profileHref = `${basePath}/refs/${ref.slug}`;
          const signalCount = signalCounts[ref.slug] ?? 0;
          const belowGate = !sufficiency.meetsThreshold(ref);
          const whistleDelta =
            league === "NHL"
              ? ref.nhlAnalytics?.minorsDelta
              : league === "NFL"
                ? ref.nflAnalytics?.flagsDelta ?? ref.foulsDelta
                : ref.foulsDelta;
          const scoringDisplay =
            leagueAvgTotal && prefersPctScoringDelta(leagueAvgTotal)
              ? directoryScoringDisplay(ref, leagueAvgTotal).formatted
              : formatSigned(ref.totalPointsDelta);
          const headline = rankingInsightHeadline(ref, leagueId, whistleDelta);
          const barMagnitude = Math.max(
            Math.abs(ref.totalPointsDelta),
            Math.abs(whistleDelta ?? 0),
          );

          return (
            <article
              key={ref.slug}
              className={`ranking-mobile-card overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4${
                belowGate && sufficiency.showAll ? " text-slate-600 opacity-50" : ""
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <RefAvatar name={ref.name} slug={ref.slug} sport={sport} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link href={profileHref} className="truncate font-medium text-white">
                      {ref.name}
                    </Link>
                    <RankingSignalPill
                      officialRef={ref}
                      leagueId={leagueId}
                      signalCount={signalCount}
                      profileHref={profileHref}
                    />
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-200">{headline}</p>
                  <StandoutMetricBar
                    label={scoringDisplay}
                    magnitude={barMagnitude}
                    maxMagnitude={5}
                    hideLabel
                  />
                  <p className="mt-2 text-xs text-slate-400">N={ref.games.toLocaleString()} games</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="ranking-table-wrap hidden overflow-x-auto md:block">
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
            {visibleRows.flatMap((ref, index) => {
              const rank = index + 1;
              const belowGate = !sufficiency.meetsThreshold(ref);

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
                  className={`ranking-table-row${
                    belowGate && sufficiency.showAll
                      ? " ranking-table-row-thin text-slate-600 opacity-50"
                      : belowGate
                        ? " ranking-table-row-thin"
                        : ""
                  }`}
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
              : `View full rankings (${sufficiency.visible.length})`}
          </button>
        </div>
      ) : null}

      <DataSufficiencyToggle
        showAll={sufficiency.showAll}
        hiddenCount={sufficiency.hiddenCount}
        onToggle={sufficiency.toggleShowAll}
        officialLabel="officials"
      />
        </>
      )}
    </div>
  );
}
