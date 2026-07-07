"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import {
  deltaTone,
  REFS_DIRECTORY_INITIAL_COUNT,
  REFS_DIRECTORY_TABS,
  sortRefsDirectory,
  type RefsDirectoryMeta,
  type RefsDirectoryTab,
} from "@/lib/refs-directory";
import type { LeagueConfig } from "@/lib/leagues";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { RefProfile } from "@/lib/types";

function DeltaCell({
  delta,
  unit,
  overBaseline,
}: {
  delta: number;
  unit: string;
  overBaseline: number;
}) {
  const tone = deltaTone(delta, overBaseline);
  const className =
    tone === "positive"
      ? "refs-directory-delta-positive"
      : tone === "negative"
        ? "refs-directory-delta-negative"
        : "refs-directory-delta-neutral";

  return (
    <span className={`refs-directory-delta ${className}`}>
      {formatSigned(delta)} {unit}
    </span>
  );
}

export function RefsDirectory({
  refs,
  meta,
  league,
  basePath = "",
}: {
  refs: RefProfile[];
  meta: RefsDirectoryMeta;
  league: LeagueConfig;
  basePath?: string;
}) {
  const [tab, setTab] = useState<RefsDirectoryTab>("over-high");
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => sortRefsDirectory(refs, tab), [refs, tab]);
  const activeTab = REFS_DIRECTORY_TABS.find((t) => t.id === tab)!;
  const visibleCount = expanded
    ? sorted.length
    : Math.min(REFS_DIRECTORY_INITIAL_COUNT, sorted.length);
  const visible = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > REFS_DIRECTORY_INITIAL_COUNT;
  const unit = league.metrics.scoreUnit;
  const sport = league.id === "nhl" ? "nhl" : "nba";
  const officialLabel =
    sorted.length === 1 ? league.officialNoun : league.officialNounPlural;

  return (
    <div className="data-card refs-directory">
      <div className="refs-directory-toolbar">
        <div
          className="refs-directory-tabs"
          role="tablist"
          aria-label="Referee directory views"
        >
          {REFS_DIRECTORY_TABS.map((item) => {
            const isActive = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`refs-directory-tab ${isActive ? "refs-directory-tab-active" : ""}`}
                onClick={() => {
                  setTab(item.id);
                  setExpanded(false);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="refs-directory-context">
          {activeTab.description} Over benchmark: {meta.leagueOverBaseline}{" "}
          combined {league.metrics.scoreUnitPlural}.
        </p>
      </div>

      <div className="refs-directory-head" aria-hidden="true">
        <span className="refs-directory-col-rank">#</span>
        <span className="refs-directory-col-official">Official</span>
        <span className="refs-directory-col-games">Games</span>
        <span className="refs-directory-col-over">Over</span>
        <span className="refs-directory-col-delta">Scoring Δ</span>
      </div>

      <ol className="refs-directory-list">
        {visible.map((ref, index) => {
          const href = `${basePath}/refs/${ref.slug}`;
          const isReveal = expanded && index >= REFS_DIRECTORY_INITIAL_COUNT;

          return (
            <li
              key={ref.slug}
              className={`refs-directory-row ${isReveal ? "refs-directory-row-reveal" : ""}`}
            >
              <Link href={href} className="refs-directory-row-link">
                <span className="refs-directory-col-rank font-mono tabular-nums">
                  {index + 1}
                </span>
                <span className="refs-directory-col-official">
                  <RefAvatar
                    name={ref.name}
                    slug={ref.slug}
                    sport={sport}
                    size="sm"
                  />
                  <span className="refs-directory-name-wrap">
                    <span className="refs-directory-name">{ref.name}</span>
                    <span className="refs-directory-number font-mono">
                      #{ref.number}
                    </span>
                  </span>
                </span>
                <span className="refs-directory-col-games font-mono tabular-nums">
                  {ref.games}
                </span>
                <span className="refs-directory-col-over font-mono tabular-nums">
                  {formatPct(ref.overRate)}
                </span>
                <span className="refs-directory-col-delta">
                  <DeltaCell
                    delta={ref.totalPointsDelta}
                    unit={unit}
                    overBaseline={meta.leagueOverBaseline}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {hasMore && !expanded && (
        <div className="refs-directory-expand-wrap">
          <button
            type="button"
            className="refs-directory-expand-btn"
            onClick={() => setExpanded(true)}
          >
            Show all {sorted.length} {officialLabel}
          </button>
        </div>
      )}
    </div>
  );
}
