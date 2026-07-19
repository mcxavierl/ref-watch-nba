"use client";

import { useMemo, useState } from "react";
import {
  filterRefProfileFouls,
  resolveRefProfileFoulCategory,
  type FoulBreakdownFilter,
  type RefProfileFoulRecord,
} from "@/lib/ref-profile-fouls";
import { FoulCategory } from "@/lib/types/foul-categories";

const FILTER_OPTIONS: { id: FoulBreakdownFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "subjective", label: "Subjective" },
  { id: "admin", label: "Admin" },
];

function categoryBadgeClass(category: FoulCategory): string {
  if (category === FoulCategory.ADMIN) {
    return "foul-breakdown-badge foul-breakdown-badge--admin";
  }
  return "foul-breakdown-badge foul-breakdown-badge--subjective";
}

function categoryLabel(category: FoulCategory): string {
  return category === FoulCategory.ADMIN ? "Admin" : "Subjective";
}

export function FoulBreakdown({ fouls }: { fouls: RefProfileFoulRecord[] }) {
  const [filter, setFilter] = useState<FoulBreakdownFilter>("all");

  const filtered = useMemo(
    () => filterRefProfileFouls(fouls, filter),
    [filter, fouls],
  );

  if (fouls.length === 0) return null;

  return (
    <section
      className="ref-profile-section foul-breakdown"
      aria-labelledby="ref-foul-breakdown-title"
    >
      <div className="foul-breakdown-head">
        <div className="foul-breakdown-head-copy">
          <h2 id="ref-foul-breakdown-title" className="ref-profile-section-title">
            Foul breakdown
          </h2>
          <p className="foul-breakdown-lead">
            Play-level calls tagged as administrative (objective) or subjective
            (judgment). Untagged historical rows count as subjective.
          </p>
        </div>
        <div
          className="refs-directory-metric-toggle foul-breakdown-toggle"
          role="group"
          aria-label="Filter fouls by category"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = option.id === filter;
            return (
              <button
                key={option.id}
                type="button"
                className={`refs-directory-metric-btn${isActive ? " refs-directory-metric-btn-active" : ""}`}
                aria-pressed={isActive}
                onClick={() => setFilter(option.id)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="foul-breakdown-body">
        <p className="foul-breakdown-count tabular-nums" aria-live="polite">
          Showing {filtered.length} of {fouls.length} tagged calls
        </p>

        {filtered.length === 0 ? (
          <p className="foul-breakdown-empty">
            No {filter === "all" ? "" : `${optionLabel(filter)} `}
            fouls in this sample.
          </p>
        ) : (
          <ul className="foul-breakdown-list">
            {filtered.map((foul) => {
              const category = resolveRefProfileFoulCategory(foul.category);
              return (
                <li key={foul.id} className="foul-breakdown-row">
                  <div className="foul-breakdown-row-main">
                    <span className="foul-breakdown-label">{foul.label}</span>
                    <span className={categoryBadgeClass(category)}>
                      {categoryLabel(category)}
                    </span>
                  </div>
                  <div className="foul-breakdown-row-meta tabular-nums">
                    <span>{foul.matchup}</span>
                    <span>{foul.date}</span>
                    {foul.team ? <span>{foul.team}</span> : null}
                    {foul.yards !== undefined ? <span>{foul.yards} yds</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function optionLabel(filter: FoulBreakdownFilter): string {
  if (filter === "admin") return "administrative";
  if (filter === "subjective") return "subjective";
  return "";
}
