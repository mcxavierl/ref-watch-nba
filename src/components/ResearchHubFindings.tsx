"use client";

import { useMemo, useState } from "react";
import { FindingAccordionItem } from "@/components/FindingAccordion";
import {
  FINDING_FILTER_GROUPS,
  FINDING_FILTER_LABELS,
  findingMatchesFilter,
  type FindingFilterGroup,
} from "@/lib/findings-shared";
import type { ResearchFinding } from "@/lib/research";

function FindingsList({
  findings,
  league,
}: {
  findings: ResearchFinding[];
  league: "NBA" | "NHL";
}) {
  if (findings.length === 0) return null;

  return (
    <div className="finding-accordion-stack">
      {findings.map((finding, index) => (
        <FindingAccordionItem
          key={finding.id}
          finding={finding}
          index={index}
          defaultOpen={index === 0}
          league={league}
        />
      ))}
    </div>
  );
}

export function ResearchHubFindings({
  nbaFindings,
  nhlFindings,
  nbaRefCount,
  nhlRefCount,
}: {
  nbaFindings: ResearchFinding[];
  nhlFindings: ResearchFinding[];
  nbaRefCount: number;
  nhlRefCount: number;
}) {
  const [filter, setFilter] = useState<FindingFilterGroup>("all");

  const filteredNba = useMemo(
    () => nbaFindings.filter((f) => findingMatchesFilter(f.category, filter)),
    [nbaFindings, filter],
  );
  const filteredNhl = useMemo(
    () => nhlFindings.filter((f) => findingMatchesFilter(f.category, filter)),
    [nhlFindings, filter],
  );
  const totalVisible = filteredNba.length + filteredNhl.length;

  return (
    <>
      <div
        className="finding-filter-bar"
        role="group"
        aria-label="Filter findings by type"
      >
        {FINDING_FILTER_GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            className={`finding-filter-chip${filter === group ? " finding-filter-chip-active" : ""}`}
            aria-pressed={filter === group}
            onClick={() => setFilter(group)}
          >
            {FINDING_FILTER_LABELS[group]}
          </button>
        ))}
      </div>

      {totalVisible === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">
          No findings match this filter. Try another category.
        </p>
      ) : (
        <>
          {filteredNba.length > 0 && (
            <section className="section-block mt-6">
              <h2 className="section-title">NBA findings</h2>
              <p className="section-lead">
                {filteredNba.length} pattern
                {filteredNba.length === 1 ? "" : "s"} from {nbaRefCount}{" "}
                officials.
              </p>
              <div className="mt-4">
                <FindingsList findings={filteredNba} league="NBA" />
              </div>
            </section>
          )}

          {filteredNhl.length > 0 && (
            <section className="section-block">
              <h2 className="section-title">NHL findings</h2>
              <p className="section-lead">
                {filteredNhl.length} pattern
                {filteredNhl.length === 1 ? "" : "s"} from {nhlRefCount}{" "}
                officials.
              </p>
              <div className="mt-4">
                <FindingsList findings={filteredNhl} league="NHL" />
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
