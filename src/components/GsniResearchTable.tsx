"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GsniResearchRow } from "@/lib/nfl/gsni-research";

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

function bandClass(band: GsniResearchRow["band"]): string {
  if (band === "quiet") return "gsni-research-band gsni-research-band--quiet";
  if (band === "heavy") return "gsni-research-band gsni-research-band--heavy";
  if (band === "neutral") return "gsni-research-band gsni-research-band--neutral";
  return "gsni-research-band gsni-research-band--withheld";
}

export function GsniResearchTable({ rows }: { rows: GsniResearchRow[] }) {
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
    <div className="data-card overflow-x-auto">
      <table className="data-table ref-data-table w-full">
        <thead className="data-table-head">
          <tr>
            <th>Official</th>
            <SortableHeader
              label="Game-State Index"
              field="gsni"
              sort={sort}
              onSort={(field) => setSort(toggleSort(sort, field))}
            />
            <SortableHeader
              label="Volatility"
              field="volatility"
              sort={sort}
              onSort={(field) => setSort(toggleSort(sort, field))}
            />
            <SortableHeader
              label="HL min"
              field="highLeverageMinutes"
              sort={sort}
              onSort={(field) => setSort(toggleSort(sort, field))}
            />
            <SortableHeader
              label="Games"
              field="sampleGames"
              sort={sort}
              onSort={(field) => setSort(toggleSort(sort, field))}
            />
            <th>Profile</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.refSlug}>
              <td>
                <Link href={row.href} className="font-medium hover:underline">
                  {row.refName}
                </Link>
              </td>
              <td className="data-table-num">
                {row.gsni !== null ? (
                  <span className={bandClass(row.band)}>{row.gsni}</span>
                ) : (
                  <span className="text-muted">Below gate</span>
                )}
              </td>
              <td className="data-table-num">
                {row.volatility !== null ? row.volatility.toFixed(1) : "-"}
              </td>
              <td className="data-table-num">{row.highLeverageMinutes.toFixed(1)}</td>
              <td className="data-table-num">{row.sampleGames}</td>
              <td className="data-table-num">
                {row.caption ? (
                  <span className="text-sm text-muted">{row.caption}</span>
                ) : (
                  <span className="text-sm text-muted">Building sample</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
