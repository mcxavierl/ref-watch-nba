"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GsniBandBadge } from "@/components/GsniBandBadge";
import { GsniDiagnosticGauge } from "@/components/GsniDiagnosticGauge";
import { GsniSampleCount } from "@/components/GsniSampleCount";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import {
  explainGsni,
  gsniInsightSummary,
  GSNI_INSUFFICIENT_DATA_LABEL,
} from "@/lib/gsni-display";
import { formatGsniScoreValue } from "@/lib/gsni-ui";
import { gsniOfficialRowAnchor } from "@/lib/gsni-research";
import type { GsniResearchRow } from "@/lib/gsni-research";

type SortField = "gsni" | "volatility" | "highLeverageMinutes" | "sampleGames";
type SortDirection = "asc" | "desc";
type SortState = `${SortField}-${SortDirection}`;

function toggleSort(current: SortState, field: SortField): SortState {
  const [activeField, direction] = current.split("-") as [SortField, SortDirection];
  if (activeField === field) {
    return `${field}-${direction === "desc" ? "asc" : "desc"}`;
  }
  return `${field}-desc`;
}

function sortValue(row: GsniResearchRow, field: SortField): number {
  switch (field) {
    case "gsni":
      return row.gsni ?? -1;
    case "volatility":
      return row.volatility ?? -1;
    case "highLeverageMinutes":
      return row.highLeverageMinutes;
    case "sampleGames":
      return row.sampleGames;
  }
}

function SortableHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SortField;
  sort: SortState;
  onSort: (field: SortField) => void;
}) {
  const [activeField, direction] = sort.split("-") as [SortField, SortDirection];
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

export function GsniResearchTable({
  rows,
  minHighLeverageMinutes,
}: {
  rows: GsniResearchRow[];
  minHighLeverageMinutes: number;
}) {
  const [sort, setSort] = useState<SortState>("gsni-desc");

  const sorted = useMemo(() => {
    const [field, direction] = sort.split("-") as [SortField, SortDirection];
    const copy = [...rows];
    copy.sort((a, b) => {
      if (a.gateCleared !== b.gateCleared) return a.gateCleared ? -1 : 1;
      const diff = sortValue(a, field) - sortValue(b, field);
      return direction === "desc" ? -diff : diff;
    });
    return copy;
  }, [rows, sort]);

  if (rows.length === 0) return null;

  return (
    <div>
      <div className="gsni-card overflow-x-auto rounded-xl border border-slate-800 p-0">
        <table className="data-table ref-data-table w-full">
          <thead className="data-table-head">
            <tr>
              <th>Official</th>
              <SortableHeader
                label="Index Score"
                field="gsni"
                sort={sort}
                onSort={(field) => setSort(toggleSort(sort, field))}
              />
              <SortableHeader
                label="Data Consistency"
                field="volatility"
                sort={sort}
                onSort={(field) => setSort(toggleSort(sort, field))}
              />
              <SortableHeader
                label="High-Leverage Minutes"
                field="highLeverageMinutes"
                sort={sort}
                onSort={(field) => setSort(toggleSort(sort, field))}
              />
              <SortableHeader
                label="Sample Size (Games)"
                field="sampleGames"
                sort={sort}
                onSort={(field) => setSort(toggleSort(sort, field))}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const profileLabel =
                row.caption ??
                (row.gsni !== null ? gsniInsightSummary(row.gsni) : null);

              return (
                <tr key={row.refSlug} id={gsniOfficialRowAnchor(row.refSlug)}>
                  <td>
                    <Link href={row.href} className="font-medium hover:underline">
                      {row.refName}
                    </Link>
                  </td>
                  <td className="data-table-num">
                    {row.gsni !== null ? (
                      <div className="gsni-table-score-cell gsni-table-score-cell--integrated min-w-[14rem]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {row.gsniShrinkageTooltip ? (
                            <MetricInfoHint hint={row.gsniShrinkageTooltip}>
                              <span className="gsni-score-value gsni-score-value--table tabular-nums text-lg">
                                {formatGsniScoreValue(row.gsni)}
                              </span>
                            </MetricInfoHint>
                          ) : (
                            <span className="gsni-score-value gsni-score-value--table tabular-nums text-lg">
                              {formatGsniScoreValue(row.gsni)}
                            </span>
                          )}
                          <GsniBandBadge
                            band={explainGsni(row.gsni).band}
                            zScore={row.gsni}
                          />
                        </div>
                        <div className="gsni-table-score-gauge-row mt-2 flex min-w-0 items-center gap-3">
                          <GsniDiagnosticGauge
                            score={row.gsni}
                            className="min-w-[5.5rem] flex-1"
                          />
                          {profileLabel ? (
                            <p className="gsni-sub-text m-0 min-w-0 flex-1 text-left text-xs leading-snug">
                              {profileLabel}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <span className="gsni-sub-text">{GSNI_INSUFFICIENT_DATA_LABEL}</span>
                    )}
                  </td>
                  <td className="data-table-num">
                    {row.volatility !== null ? (
                      <GsniSampleCount>{row.volatility.toFixed(1)}</GsniSampleCount>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="data-table-num">
                    <GsniSampleCount>{row.highLeverageMinutes.toFixed(1)}</GsniSampleCount>
                  </td>
                  <td className="data-table-num">
                    <GsniSampleCount>{row.sampleGames}</GsniSampleCount>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="gsni-sub-text mt-2 text-xs text-slate-500">
        High-leverage minutes gate: {minHighLeverageMinutes} min minimum.
      </p>
    </div>
  );
}
