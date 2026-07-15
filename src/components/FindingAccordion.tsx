"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FindingCategoryPillLabel } from "@/components/FindingCategoryPillLabel";
import { EdgeFinderCell } from "@/components/EdgeFinderCell";
import { ContextualLinkerText } from "@/lib/contextual-linker";
import {
  FindingAccordionChevron,
  FindingContextRow,
  FindingHeaderRow,
  FindingMetricsGrid,
  FindingRegionalContext,
  FindingSampleConfidenceMeta,
} from "@/components/FindingCardLayout";
import {
  angleHeadline,
  dedupeFindingStats,
  mergeGroupPreviewStats,
  statsForAngleBlock,
  strongestConfidenceTier,
  syntheticSampleNote,
  uniqueFindingCategories,
  type OfficialIdentity,
} from "@/lib/finding-grouping";
import { pickStrongestEvSnapshot, type FindingEvSnapshot } from "@/lib/finding-ev-display";
import {
  resolveFindingExplainer,
  type Finding,
  type FindingLink,
} from "@/lib/findings-shared";
import { FindingExplainer } from "@/components/FindingNameWall";

export function FindingFooterLinks({ links }: { links: FindingLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="finding-footer-link">
          {link.label}
          <ArrowRight className="finding-footer-link-arrow" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

export function FindingAccordionItem({
  finding,
  defaultOpen = false,
  league,
  evSnapshot,
}: {
  finding: Finding;
  defaultOpen?: boolean;
  league?: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  evSnapshot?: FindingEvSnapshot | null;
}) {
  return (
    <details className="finding-accordion data-card" open={defaultOpen}>
      <summary className="finding-accordion-trigger">
        <div className="finding-accordion-trigger-inner">
          <div className="finding-accordion-main">
            <FindingHeaderRow
              finding={finding}
              league={league}
              trailing={<FindingAccordionChevron />}
            />
            <FindingMetricsGrid stats={dedupeFindingStats(finding.stats)} />
            <FindingContextRow explainer={finding.explainer} />
          </div>
          {evSnapshot !== undefined ? (
            <EdgeFinderCell snapshot={evSnapshot} />
          ) : null}
        </div>
      </summary>

      <div className="finding-accordion-panel">
        {finding.summary && (
          <p className="finding-accordion-summary">
            <ContextualLinkerText text={finding.summary} />
          </p>
        )}

        <FindingRegionalContext text={finding.regionalContext} />

        <div className="finding-accordion-footer">
          <FindingFooterLinks links={finding.links} />
        </div>
      </div>
    </details>
  );
}

function FindingAngleBlock({
  finding,
  officialName,
  allFindings,
  angleIndex,
  evSnapshot,
}: {
  finding: Finding;
  officialName: string;
  allFindings: Finding[];
  angleIndex: number;
  evSnapshot?: FindingEvSnapshot | null;
}) {
  const angleStats = statsForAngleBlock(finding, allFindings, angleIndex);

  return (
    <article className="finding-angle-block">
      <div className="finding-angle-header">
        <span className="finding-meta-pill finding-angle-category">
          <FindingCategoryPillLabel category={finding.category} />
        </span>
        <h4 className="finding-angle-title">{angleHeadline(finding, officialName)}</h4>
        {evSnapshot !== undefined ? (
          <EdgeFinderCell snapshot={evSnapshot} compact />
        ) : null}
      </div>

      {angleStats.length > 0 ? (
        <FindingMetricsGrid stats={angleStats} />
      ) : null}

      {finding.summary ? (
        <p className="finding-angle-summary">
          <ContextualLinkerText text={finding.summary} />
        </p>
      ) : null}

      {finding.explainer ? (
        <p className="finding-angle-context">
          <span className="finding-card-context-label">Why it matters: </span>
          <FindingExplainer text={resolveFindingExplainer(finding.explainer)} />
        </p>
      ) : null}

      <FindingRegionalContext text={finding.regionalContext} />

      {finding.links.length > 0 ? (
        <div className="finding-angle-footer">
          <FindingFooterLinks links={finding.links} />
        </div>
      ) : null}
    </article>
  );
}

function OfficialFindingsSingleCard({
  official,
  finding,
  league,
  evSnapshot,
}: {
  official: OfficialIdentity;
  finding: Finding;
  league?: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  evSnapshot?: FindingEvSnapshot | null;
}) {
  return (
    <article className="finding-accordion official-findings-card official-findings-card--single data-card">
      <div className="finding-accordion-trigger-inner official-findings-single-body">
        <div className="finding-accordion-main">
          <FindingHeaderRow
            title={official.name}
            titleHref={official.profileHref}
            categories={[finding.category]}
            league={league}
          />
          <FindingSampleConfidenceMeta
            finding={finding}
            className="official-findings-confidence"
          />
          <FindingMetricsGrid stats={dedupeFindingStats(finding.stats)} />
          <p className="finding-official-angle-lead">
            {angleHeadline(finding, official.name)}
          </p>
          {finding.summary ? (
            <p className="finding-angle-summary">{finding.summary}</p>
          ) : null}
          <FindingContextRow explainer={finding.explainer} />
          <FindingRegionalContext text={finding.regionalContext} />
          {finding.links.length > 0 ? (
            <div className="finding-accordion-footer">
              <FindingFooterLinks links={finding.links} />
            </div>
          ) : null}
        </div>
        {evSnapshot !== undefined ? (
          <EdgeFinderCell snapshot={evSnapshot} />
        ) : null}
      </div>
    </article>
  );
}

export function OfficialFindingsAccordionItem({
  official,
  findings,
  defaultOpen = false,
  league,
  evByFindingId,
}: {
  official: OfficialIdentity;
  findings: Finding[];
  defaultOpen?: boolean;
  league?: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  evByFindingId?: Record<string, FindingEvSnapshot | null>;
}) {
  const groupEv = evByFindingId
    ? pickStrongestEvSnapshot(findings.map((row) => evByFindingId[row.id]))
    : undefined;

  if (findings.length === 1) {
    return (
      <OfficialFindingsSingleCard
        official={official}
        finding={findings[0]!}
        league={league}
        evSnapshot={
          evByFindingId ? evByFindingId[findings[0]!.id] : undefined
        }
      />
    );
  }

  const categories = uniqueFindingCategories(findings);
  const previewStats = mergeGroupPreviewStats(findings);
  const confidenceTier = strongestConfidenceTier(findings);
  const sampleNote = syntheticSampleNote(findings);
  const angleCount = findings.length;

  return (
    <details
      className="finding-accordion official-findings-card data-card"
      open={defaultOpen}
    >
      <summary className="finding-accordion-trigger">
        <div className="finding-accordion-trigger-inner">
          <div className="finding-accordion-main">
            <FindingHeaderRow
              title={official.name}
              titleHref={official.profileHref}
              categories={categories}
              league={league}
              trailing={<FindingAccordionChevron />}
            />
            <FindingSampleConfidenceMeta
              sampleNote={sampleNote}
              tier={confidenceTier}
              className="official-findings-confidence"
            />
            {previewStats.length > 0 ? (
              <FindingMetricsGrid stats={previewStats} />
            ) : null}
            <p className="finding-official-preview">
              {angleCount} distinct pattern{angleCount === 1 ? "" : "s"} in this
              dataset
            </p>
          </div>
          {groupEv !== undefined ? <EdgeFinderCell snapshot={groupEv} /> : null}
        </div>
      </summary>

      <div className="finding-accordion-panel official-findings-panel">
        <div className="finding-angle-stack">
          {findings.map((finding, index) => (
            <FindingAngleBlock
              key={finding.id}
              finding={finding}
              officialName={official.name}
              allFindings={findings}
              angleIndex={index}
              evSnapshot={evByFindingId?.[finding.id]}
            />
          ))}
        </div>
      </div>
    </details>
  );
}
