"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RefAvatar } from "@/components/RefAvatar";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import type { MatrixCloseGameStats } from "@/lib/league-matrix-data";
import type { LeagueMatrixSport } from "@/hooks/useLeagueMatrixData";

export type MatrixRowProps = {
  refName: string;
  winRate: string;
  variance: string;
  closeGameStats: MatrixCloseGameStats;
  whistleDiff: string;
  refProfileLink: string;
  rank?: number;
  refSlug?: string;
  sport?: LeagueMatrixSport;
  winRateTone?: "positive" | "negative" | "neutral";
  whistleTone?: "positive" | "negative" | "neutral";
  baselineTitle?: string;
};

export function MatrixRow({
  refName,
  winRate,
  variance,
  closeGameStats,
  whistleDiff,
  refProfileLink,
  rank,
  refSlug,
  sport = "nba",
  winRateTone = "neutral",
  whistleTone = "neutral",
  baselineTitle,
}: MatrixRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li
      className={`team-ref-matrix-row analytics-matrix-row py-2 text-sm${expanded ? " analytics-matrix-row--expanded" : ""}`}
    >
      <div className="team-ref-matrix-row-main">
        {rank !== undefined ? (
          <span className="team-ref-matrix-rank tabular-nums text-right" aria-hidden>
            {rank}
          </span>
        ) : (
          <span className="team-ref-matrix-rank" aria-hidden />
        )}
        <div className="team-ref-matrix-expand master-table-expand-cell shrink-0">
          <button
            type="button"
            className="ranking-table-row-toggle-btn master-table-expand-btn md:hidden"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} details for ${refName}`}
            onClick={() => setExpanded((current) => !current)}
          >
            <Plus
              className={`h-3.5 w-3.5 shrink-0 ranking-table-row-toggle-icon transition-transform duration-150${expanded ? " ranking-table-row-toggle-icon--expanded" : ""}`}
              aria-hidden
            />
          </button>
        </div>
        <div className="team-ref-matrix-ref min-w-0">
          <Link
            href={refProfileLink}
            className="team-ref-matrix-ref-link"
            aria-label={`${refName} profile`}
          >
            {refSlug ? (
              <RefAvatar
                name={refName}
                slug={refSlug}
                sport={sport}
                size="sm"
                className="team-ref-matrix-ref-avatar shrink-0"
              />
            ) : null}
            <span className="team-ref-matrix-ref-name truncate">{refName}</span>
          </Link>
        </div>
        <span
          className={`team-ref-matrix-stat team-ref-matrix-stat--win tabular-nums text-right team-ref-matrix-stat--${winRateTone}`}
        >
          {winRate}
        </span>
        <span
          className={`team-ref-matrix-stat team-ref-matrix-stat--baseline tabular-nums text-right team-ref-matrix-stat--${winRateTone} master-table-metric-secondary`}
          title={baselineTitle}
        >
          {variance}
        </span>
        <span className="team-ref-matrix-stat team-ref-matrix-stat--close tabular-nums text-right master-table-metric-secondary">
          <MetricInfoHint hint={closeGameStats.definitionTooltip}>
            <button type="button" className="team-ref-matrix-close-btn tabular-nums">
              {closeGameStats.fraction}
            </button>
          </MetricInfoHint>
        </span>
        <span
          className={`team-ref-matrix-stat team-ref-matrix-stat--whistle tabular-nums text-right team-ref-matrix-stat--${whistleTone} master-table-metric-secondary`}
          title="Whistle differential per game"
        >
          {whistleDiff}
        </span>
      </div>
      {expanded ? (
        <div className="team-ref-matrix-row-details md:hidden">
          <div className="team-ref-matrix-row-details-stat">
            <span className="team-ref-matrix-row-details-label">vs baseline</span>
            <span
              className={`team-ref-matrix-row-details-value tabular-nums text-right team-ref-matrix-stat--${winRateTone}`}
            >
              {variance}
            </span>
          </div>
          <div className="team-ref-matrix-row-details-stat">
            <span className="team-ref-matrix-row-details-label">Close games</span>
            <span className="team-ref-matrix-row-details-value tabular-nums text-right">
              {closeGameStats.fraction}
            </span>
          </div>
          <div className="team-ref-matrix-row-details-stat">
            <span className="team-ref-matrix-row-details-label">Whistle diff</span>
            <span
              className={`team-ref-matrix-row-details-value tabular-nums text-right team-ref-matrix-stat--${whistleTone}`}
            >
              {whistleDiff}
            </span>
          </div>
        </div>
      ) : null}
    </li>
  );
}
