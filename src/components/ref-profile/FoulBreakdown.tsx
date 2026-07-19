"use client";

import { useMemo } from "react";
import { FoulViewToggle } from "@/components/ref-profile/FoulViewToggle";
import { useFoulView } from "@/hooks/useFoulView";
import { foulViewAriaLabel } from "@/lib/foul-view";
import {
  filterRefProfileFouls,
  resolveRefProfileFoulCategory,
  type RefProfileFoulRecord,
} from "@/lib/ref-profile-fouls";
import { FoulCategory } from "@/lib/types/foul-categories";

function categoryBadgeClass(category: FoulCategory): string {
  if (category === FoulCategory.ADMIN) {
    return "foul-breakdown-badge foul-breakdown-badge--admin";
  }
  return "foul-breakdown-badge foul-breakdown-badge--subjective";
}

function categoryLabel(category: FoulCategory): string {
  return category === FoulCategory.ADMIN ? "Administrative" : "Subjective";
}

export function FoulBreakdown({ fouls }: { fouls: RefProfileFoulRecord[] }) {
  const { view, setView } = useFoulView();

  const filtered = useMemo(
    () => filterRefProfileFouls(fouls, view),
    [view, fouls],
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
        <FoulViewToggle
          className="foul-breakdown-toggle"
          view={view}
          onChange={setView}
        />
      </div>

      <div className="foul-breakdown-body">
        <p className="foul-breakdown-count tabular-nums" aria-live="polite">
          Showing {filtered.length} of {fouls.length} tagged calls
          {view !== "all" ? ` (${foulViewAriaLabel(view).toLowerCase()})` : ""}
        </p>

        {filtered.length === 0 ? (
          <p className="foul-breakdown-empty">
            No {view === "all" ? "" : `${foulViewAriaLabel(view).toLowerCase()} `}
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
