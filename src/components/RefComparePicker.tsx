"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CompareRefPickerEntry } from "@/lib/ref-compare";

export function RefComparePicker({
  id,
  label,
  entries,
  value,
  onChange,
}: {
  id: string;
  label: string;
  entries: CompareRefPickerEntry[];
  value: string;
  onChange: (key: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries.slice(0, 80);
    return entries
      .filter(
        (entry) =>
          entry.name.toLowerCase().includes(normalized) ||
          entry.leagueLabel.toLowerCase().includes(normalized) ||
          entry.slug.toLowerCase().includes(normalized),
      )
      .slice(0, 40);
  }, [entries, query]);

  const selected = entries.find((entry) => entry.key === value) ?? null;

  return (
    <div className="ref-compare-picker">
      <label htmlFor={id} className="ref-compare-picker-label">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or league"
        className="ref-compare-picker-search"
        list={`${id}-options`}
      />
      <datalist id={`${id}-options`}>
        {filtered.map((entry) => (
          <option
            key={entry.key}
            value={`${entry.name} (${entry.leagueLabel})`}
          />
        ))}
      </datalist>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ref-compare-picker-select"
      >
        <option value="">Choose an official</option>
        {filtered.map((entry) => (
          <option key={entry.key} value={entry.key}>
            {entry.name} ({entry.leagueLabel}) · {entry.games} gp
          </option>
        ))}
      </select>
      {selected ? (
        <p className="ref-compare-picker-selected">
          <Link href={selected.href} className="ref-compare-picker-profile-link">
            {selected.name} profile →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
