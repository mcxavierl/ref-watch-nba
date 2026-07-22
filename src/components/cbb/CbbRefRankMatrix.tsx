"use client";

import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { useMemo } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import { signedDeltaTone } from "@/lib/metric-delight";
import { qualifiedRefs, sortRefRankings, type RefRankingSort } from "@/lib/rankings";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { RefProfile } from "@/lib/types";
import "./cbb-research-terminal.css";

type CbbRefRankMatrixProps = {
  refs: RefProfile[];
  minSampleSize: number;
  basePath?: string;
  limit?: number;
  defaultSort?: RefRankingSort;
};

function toneClass(value: number | undefined): string {
  if (value === undefined) return "cbb-ref-rank-stat--neutral";
  const tone = signedDeltaTone(value);
  return `cbb-ref-rank-stat--${tone}`;
}

export function CbbRefRankMatrix({
  refs,
  minSampleSize,
  basePath = "/cbb",
  limit = 10,
  defaultSort = "scoring-desc",
}: CbbRefRankMatrixProps) {
  const rows = useMemo(() => {
    const pool = qualifiedRefs(refs, minSampleSize);
    return sortRefRankings(pool, defaultSort).slice(0, limit);
  }, [refs, minSampleSize, defaultSort, limit]);

  if (rows.length === 0) {
    return (
      <p className="cbb-ref-rank-empty text-sm text-zinc-600">
        No officials meet the sample gate in this conference yet.
      </p>
    );
  }

  return (
    <div className="cbb-ref-rank-matrix stat-data-container master-table-scroll">
      <div className="cbb-ref-rank-matrix-head" aria-hidden>
        <span className="cbb-ref-rank-matrix-head-rank">Rank</span>
        <span className="cbb-ref-rank-matrix-head-ref">Official</span>
        <span className="cbb-ref-rank-matrix-head-stat">Scoring Δ</span>
        <span className="cbb-ref-rank-matrix-head-stat cbb-ref-rank-matrix-head-stat--fouls">
          Fouls Δ
        </span>
        <span className="cbb-ref-rank-matrix-head-stat cbb-ref-rank-matrix-head-stat--over">
          Over rate
        </span>
      </div>
      <ol className="cbb-ref-rank-matrix-list">
        {rows.map((ref, index) => {
          const rank = index + 1;
          const profileHref = `${basePath}/refs/${ref.slug}`;
          const foulsDelta = ref.foulsDelta;

          return (
            <li key={ref.slug} className="cbb-ref-rank-matrix-row">
              <div className="cbb-ref-rank-matrix-row-main">
                <span className="cbb-ref-rank-matrix-rank tabular-nums" aria-hidden>
                  {rank}
                </span>
                <div className="cbb-ref-rank-matrix-ref">
                  <Link href={profileHref} className="cbb-ref-rank-matrix-ref-link">
                    <RefAvatar
                      name={ref.name}
                      slug={ref.slug}
                      sport="cbb"
                      size="sm"
                      className="cbb-ref-rank-matrix-avatar"
                    />
                    <span className="cbb-ref-rank-matrix-ref-name">{ref.name}</span>
                  </Link>
                </div>
                <span
                  className={`cbb-ref-rank-matrix-stat tabular-nums ${toneClass(ref.totalPointsDelta)}`}
                >
                  {formatSigned(ref.totalPointsDelta)}
                </span>
                <span
                  className={`cbb-ref-rank-matrix-stat cbb-ref-rank-matrix-stat--fouls tabular-nums ${toneClass(foulsDelta)}`}
                >
                  {foulsDelta !== undefined ? formatSigned(foulsDelta) : "-"}
                </span>
                <span className="cbb-ref-rank-matrix-stat cbb-ref-rank-matrix-stat--over tabular-nums">
                  {formatPct(ref.overRate)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
