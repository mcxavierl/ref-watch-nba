"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { GsniBandBadge } from "@/components/GsniBandBadge";
import { GsniSampleCount } from "@/components/GsniSampleCount";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import {
  DataSufficiencyNotice,
  DataSufficiencyToggle,
  DATA_SUFFICIENCY_GSNI_EXPANDED_NOTE,
} from "@/components/shared/DataSufficiencyNotice";
import { explainGsni, GSNI_INSUFFICIENT_DATA_LABEL } from "@/lib/gsni-display";
import { formatGsniScoreValue } from "@/lib/gsni-ui";
import { useDataSufficiencyFilter } from "@/hooks/useDataSufficiencyFilter";
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

  const meetsThreshold = useCallback(
    (row: GsniResearchRow) => row.gateCleared,
    [],
  );

  const sortedAll = useMemo(() => {
    const [field, direction] = sort.split("-") as [SortField, SortDirection];
    const copy = [...rows];
    copy.sort((a, b) => {
      if (a.gateCleared !== b.gateCleared) return a.gateCleared ? -1 : 1;
      const diff = sortValue(a, field) - sortValue(b, field);
      return direction === "desc" ? -diff : diff;
    });
    return copy;
  }, [rows, sort]);

  const sufficiency = useDataSufficiencyFilter(sortedAll, meetsThreshold);
  const sorted = sufficiency.visible;

  if (rows.length === 0) return null;

  return (
    <div>
      <DataSufficiencyNotice
        showAll={sufficiency.showAll}
        hiddenCount={sufficiency.hiddenCount}
        onExpand={sufficiency.expandList}
        expandedNote={DATA_SUFFICIENCY_GSNI_EXPANDED_NOTE}
        className="mb-3"
      />

      <div className="gsni-card overflow-x-auto p-0">
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
              <th>Frequency Profile</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const belowGate = !sufficiency.meetsThreshold(row);
              return (
                <tr
                  key={row.refSlug}
                  className={
                    belowGate && sufficiency.showAll
                      ? "text-slate-600 opacity-50"
                      : undefined
                  }
                >
                  <td>
                    <Link href={row.href} className="font-medium hover:underline">
                      {row.refName}
                    </Link>
                  </td>
                  <td className="data-table-num">
                    {row.gsni !== null ? (
                      <div className="gsni-table-score-cell min-w-[8.5rem]">
                        {row.gsniShrinkageTooltip ? (
                          <MetricInfoHint hint={row.gsniShrinkageTooltip}>
                            <span className="gsni-score-value gsni-score-value--table tabular-nums">
                              {formatGsniScoreValue(row.gsni)}
                            </span>
                          </MetricInfoHint>
                        ) : (
                          <span className="gsni-score-value gsni-score-value--table tabular-nums">
                            {formatGsniScoreValue(row.gsni)}
                          </span>
                        )}
                        <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                          <GsniBandBadge band={explainGsni(row.gsni).band} zScore={row.gsni} />
                        </div>
                        <GsniSharedTrack
                          mode="score"
                          value={row.gsni}
                          showValue={false}
                          showCenterLabel
                          className="gsni-shared-track--compact mt-2"
                        />
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
                  <td>
                    {row.caption ? (
                      <span className="gsni-sub-text">{row.caption}</span>
                    ) : (
                      <span className="gsni-sub-text">{GSNI_INSUFFICIENT_DATA_LABEL}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DataSufficiencyToggle
        showAll={sufficiency.showAll}
        hiddenCount={sufficiency.hiddenCount}
        onToggle={sufficiency.toggleShowAll}
        officialLabel="officials"
        className="mt-3"
      />

      <p className="gsni-sub-text mt-2 text-xs text-slate-500">
        High-leverage minutes gate: {minHighLeverageMinutes} min minimum.
      </p>
    </div>
  );
}
