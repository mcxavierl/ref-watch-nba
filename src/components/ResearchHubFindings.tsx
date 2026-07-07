"use client";

import { useMemo, useState } from "react";
import { FindingAccordionItem } from "@/components/FindingAccordion";
import {
  FINDING_FILTER_GROUPS,
  FINDING_FILTER_LABELS,
  findingMatchesFilter,
  RESEARCH_LEAGUE_FILTER_GROUPS,
  RESEARCH_LEAGUE_FILTER_LABELS,
  researchLeagueFilterMatches,
  type FindingFilterGroup,
  type ResearchLeagueFilter,
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
  defaultLeagueFilter = "all",
}: {
  nbaFindings: ResearchFinding[];
  nhlFindings: ResearchFinding[];
  nbaRefCount: number;
  nhlRefCount: number;
  defaultLeagueFilter?: ResearchLeagueFilter;
}) {
  const [leagueFilter, setLeagueFilter] =
    useState<ResearchLeagueFilter>(defaultLeagueFilter);
  const [categoryFilter, setCategoryFilter] =
    useState<FindingFilterGroup>("all");

  const filteredNba = useMemo(
    () =>
      nbaFindings.filter((finding) =>
        findingMatchesFilter(finding.category, categoryFilter),
      ),
    [nbaFindings, categoryFilter],
  );
  const filteredNhl = useMemo(
    () =>
      nhlFindings.filter((finding) =>
        findingMatchesFilter(finding.category, categoryFilter),
      ),
    [nhlFindings, categoryFilter],
  );

  const showNba =
    researchLeagueFilterMatches("NBA", leagueFilter) && filteredNba.length > 0;
  const showNhl =
    researchLeagueFilterMatches("NHL", leagueFilter) && filteredNhl.length > 0;
  const totalVisible = (showNba ? filteredNba.length : 0) +
    (showNhl ? filteredNhl.length : 0);

  return (
    <>
      <div
        className="finding-filter-bar"
        role="group"
        aria-label="Filter findings by league"
      >
        {RESEARCH_LEAGUE_FILTER_GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            className={`finding-filter-chip${leagueFilter === group ? " finding-filter-chip-active" : ""}`}
            aria-pressed={leagueFilter === group}
            onClick={() => setLeagueFilter(group)}
          >
            {RESEARCH_LEAGUE_FILTER_LABELS[group]}
          </button>
        ))}
      </div>

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

      {totalVisible === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">
          No findings match this filter. Try another league or category.
        </p>
      ) : (
        <>
          {showNba && (
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

          {showNhl && (
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
