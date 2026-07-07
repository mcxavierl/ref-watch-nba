"use client";

import type { TeamRefSort } from "@/lib/teamRefLeaderboards";
import { TEAM_REF_SORT_OPTIONS } from "@/lib/teamRefLeaderboards";

export function TeamRefSortBar({
  value,
  onChange,
  id,
}: {
  value: TeamRefSort;
  onChange: (sort: TeamRefSort) => void;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor={id ?? "team-ref-sort"}
        className="text-xs font-medium text-zinc-600"
      >
        Sort by
      </label>
      <select
        id={id ?? "team-ref-sort"}
        value={value}
        onChange={(e) => onChange(e.target.value as TeamRefSort)}
        className="rounded-md border border-border bg-white px-2.5 py-1.5 text-sm text-zinc-900 shadow-sm"
      >
        {TEAM_REF_SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
