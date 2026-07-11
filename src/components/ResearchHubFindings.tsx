"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FindingAccordionItem } from "@/components/FindingAccordion";
import {
  FINDING_FILTER_GROUPS,
  FINDING_FILTER_LABELS,
  findingConfidenceTier,
  findingMatchesFilter,
  sortFindingsByStrength,
  type FindingFilterGroup,
} from "@/lib/findings-shared";
import type { ConfidenceTier } from "@/lib/user-language";
import type { ResearchFinding } from "@/lib/research";

function parseFilter(raw: string | null): FindingFilterGroup {
  if (raw && (FINDING_FILTER_GROUPS as string[]).includes(raw)) {
    return raw as FindingFilterGroup;
  }
  return "all";
}

function parseConfidence(raw: string | null): ConfidenceTier | null {
  if (raw === "Strong" || raw === "Moderate" || raw === "Thin") return raw;
  return null;
}

export function ResearchHubFindings({
  findings,
  league,
  refCount,
}: {
  findings: ResearchFinding[];
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  refCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFilter = parseFilter(searchParams.get("filter"));
  const confidenceFilter = parseConfidence(searchParams.get("confidence"));

  const setCategoryFilter = (group: FindingFilterGroup) => {
    const params = new URLSearchParams(searchParams.toString());
    if (group === "all") params.delete("filter");
    else params.set("filter", group);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  const filtered = useMemo(() => {
    const byCategory = findings.filter((finding) =>
      findingMatchesFilter(finding.category, categoryFilter),
    );
    const byConfidence = confidenceFilter
      ? byCategory.filter(
          (finding) => findingConfidenceTier(finding) === confidenceFilter,
        )
      : byCategory;
    return sortFindingsByStrength(byConfidence);
  }, [findings, categoryFilter, confidenceFilter]);

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

      {confidenceFilter && (
        <p className="mt-3 text-sm text-zinc-600">
          Showing {confidenceFilter.toLowerCase()}-confidence findings.{" "}
          <button
            type="button"
            className="font-semibold text-zinc-800 underline-offset-2 hover:underline"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("confidence");
              const qs = params.toString();
              router.replace(qs ? `?${qs}` : "?", { scroll: false });
            }}
          >
            Clear confidence filter
          </button>
        </p>
      )}

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
            Strong-confidence findings appear first; thin samples at the bottom.
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
