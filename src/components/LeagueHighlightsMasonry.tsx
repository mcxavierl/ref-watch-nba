"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { InsightCard } from "@/components/shared/InsightCard";
import type { HighlightLeagueId } from "@/lib/finding-insight-cards";
import { findingToLeagueInsightCard } from "@/lib/finding-insight-cards";
import type { Finding, FindingLeague } from "@/lib/findings-shared";
import {
  filterFindingsByLeague,
  researchHubHref,
  resolveFindingExplainer,
  sortFindingsByStrength,
} from "@/lib/findings-shared";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

function HighlightInsightCard({
  finding,
  card,
  index,
  lead,
}: {
  finding: Finding;
  card: LeagueInsightCard;
  index: number;
  lead: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`insight-masonry-card${lead ? " insight-masonry-card--lead" : ""}`}
    >
      <InsightCard card={card} variant="inline" index={index} />
      <button
        type="button"
        className="insight-masonry-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <ChevronDown
          className={`insight-masonry-toggle-icon${expanded ? " insight-masonry-toggle-icon--open" : ""}`}
          aria-hidden
        />
        Why it matters
      </button>
      {expanded && (
        <p className="insight-masonry-explainer">
          {resolveFindingExplainer(finding.explainer)}
        </p>
      )}
    </div>
  );
}

export function LeagueHighlightsMasonry({
  leagueId,
  findings,
  league,
  title = "Season highlights",
  sectionLead,
  scopeLabel,
  headerRight,
  initialVisibleCount = 6,
}: {
  leagueId: HighlightLeagueId;
  findings: Finding[];
  league?: FindingLeague;
  title?: string;
  sectionLead?: string;
  scopeLabel?: string;
  headerRight?: ReactNode;
  initialVisibleCount?: number;
}) {
  const scoped = sortFindingsByStrength(
    league ? filterFindingsByLeague(findings, league) : findings,
  );
  const visible = scoped.slice(0, initialVisibleCount);

  if (visible.length === 0) return null;

  const viewAllHref = league ? researchHubHref(league) : "/research";

  return (
    <section
      id="dataset-findings"
      aria-labelledby={`${leagueId}-highlights-heading`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="section-title" id={`${leagueId}-highlights-heading`}>
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {headerRight}
          <Link
            href={viewAllHref}
            className="text-sm font-semibold text-zinc-800 hover:text-raptors hover:underline"
          >
            View all findings →
          </Link>
        </div>
      </div>
      {sectionLead && <p className="section-lead">{sectionLead}</p>}
      {scopeLabel && <p className="mt-1 text-sm text-zinc-500">{scopeLabel}</p>}
      <div className="insight-masonry mt-4">
        {visible.map((finding, index) => (
          <HighlightInsightCard
            key={finding.id}
            finding={finding}
            card={findingToLeagueInsightCard(leagueId, finding)}
            index={index}
            lead={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
