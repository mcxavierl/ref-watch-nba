"use client";

import Link from "next/link";
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
  return (
    <li className="team-ref-matrix-row analytics-matrix-row py-2 text-sm">
      {rank !== undefined ? (
        <span className="team-ref-matrix-rank tabular-nums" aria-hidden>
          {rank}
        </span>
      ) : (
        <span className="team-ref-matrix-rank" aria-hidden />
      )}
      <div className="team-ref-matrix-ref">
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
              className="team-ref-matrix-ref-avatar"
            />
          ) : null}
          <span className="team-ref-matrix-ref-name">{refName}</span>
        </Link>
      </div>
      <span
        className={`team-ref-matrix-stat team-ref-matrix-stat--win tabular-nums team-ref-matrix-stat--${winRateTone}`}
      >
        {winRate}
      </span>
      <span
        className={`team-ref-matrix-stat team-ref-matrix-stat--baseline tabular-nums team-ref-matrix-stat--${winRateTone}`}
        title={baselineTitle}
      >
        {variance}
      </span>
      <span className="team-ref-matrix-stat team-ref-matrix-stat--close tabular-nums">
        <MetricInfoHint hint={closeGameStats.definitionTooltip}>
          <button type="button" className="team-ref-matrix-close-btn">
            {closeGameStats.fraction}
          </button>
        </MetricInfoHint>
      </span>
      <span
        className={`team-ref-matrix-stat team-ref-matrix-stat--whistle tabular-nums team-ref-matrix-stat--${whistleTone}`}
        title="Whistle differential per game"
      >
        {whistleDiff}
      </span>
    </li>
  );
}
