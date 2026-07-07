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

export function ResearchHubFindings({
  findings,
  league,
  refCount,
}: {
  findings: ResearchFinding[];
  league: "NBA" | "NHL";
  refCount: number;
}) {
  const [categoryFilter, setCategoryFilter] =
    useState<FindingFilterGroup>("all");

  const filtered = useMemo(
    () =>
      findings.filter((finding) =>
        findingMatchesFilter(finding.category, categoryFilter),
      ),
    [findings, categoryFilter],
  );

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
            className={`finding-filter-chip${categoryFilter === group ? " finding-filter-chip-active" : ""}`}
            aria-pressed={categoryFilter === group}
            onClick={() => setCategoryFilter(group)}
          >
            {FINDING_FILTER_LABELS[group]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">
          No findings match this filter. Try another category.
        </p>
      ) : (
        <section className="section-block mt-6">
          <h2 className="section-title">{league} findings</h2>
          <p className="section-lead">
            {filtered.length} pattern
            {filtered.length === 1 ? "" : "s"} from {refCount} officials.
          </p>
          <div className="finding-accordion-stack mt-4">
            {filtered.map((finding, index) => (
              <FindingAccordionItem
                key={finding.id}
                finding={finding}
                index={index}
                defaultOpen={index === 0}
                league={league}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
