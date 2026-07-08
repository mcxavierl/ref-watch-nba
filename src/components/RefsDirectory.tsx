"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import {
  directoryDeltaTone,
  formatDirectoryDelta,
  NHL_DIRECTORY_METRICS,
  nhlDirectoryMetricDelta,
  REFS_DIRECTORY_INITIAL_COUNT,
  REFS_DIRECTORY_TABS,
  sortRefsDirectory,
  type NhlDirectoryMetric,
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
  showUnit = true,
  heatMap = false,
}: {
  delta: number;
  unit: string;
  overBaseline: number;
  showUnit?: boolean;
  heatMap?: boolean;
}) {
  const tone = directoryDeltaTone(delta, overBaseline, heatMap);
  const className = heatMap
    ? tone === "positive"
      ? "ref-delta-positive"
      : tone === "negative"
        ? "ref-delta-negative"
        : "refs-directory-delta-neutral"
    : tone === "positive"
      ? "refs-directory-delta-positive"
      : tone === "negative"
        ? "refs-directory-delta-negative"
        : "refs-directory-delta-neutral";

  const formatted = showUnit ? formatSigned(delta) : formatDirectoryDelta(delta);

  return (
    <span className={`refs-directory-delta ${className}`}>
      {formatted}
      {showUnit ? ` ${unit}` : ""}
    </span>
  );
}

function NhlMetricToggle({
  metric,
  onChange,
}: {
  metric: NhlDirectoryMetric;
  onChange: (metric: NhlDirectoryMetric) => void;
}) {
  return (
    <div
      className="refs-directory-metric-toggle"
      role="group"
      aria-label="Delta metric"
    >
      {NHL_DIRECTORY_METRICS.map((item) => {
        const isActive = item.id === metric;
        return (
          <button
            key={item.id}
            type="button"
            className={`refs-directory-metric-btn ${isActive ? "refs-directory-metric-btn-active" : ""}`}
            aria-pressed={isActive}
            title={
              item.id === "ppo"
                ? "Power play opportunity data coming soon"
                : undefined
            }
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
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
  const [nhlMetric, setNhlMetric] = useState<NhlDirectoryMetric>("goals");

  const sorted = useMemo(() => sortRefsDirectory(refs, tab), [refs, tab]);
  const activeTab = REFS_DIRECTORY_TABS.find((t) => t.id === tab)!;
  const visibleCount = expanded
    ? sorted.length
    : Math.min(REFS_DIRECTORY_INITIAL_COUNT, sorted.length);
  const visible = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > REFS_DIRECTORY_INITIAL_COUNT;
  const unit = league.metrics.scoreUnit;
  const sport = league.id === "nhl" ? "nhl" : "nba";
  const isNhl = league.id === "nhl";
  const officialLabel =
    sorted.length === 1 ? league.officialNoun : league.officialNounPlural;
  const activeMetric = NHL_DIRECTORY_METRICS.find((m) => m.id === nhlMetric)!;
  const deltaHeader = isNhl ? activeMetric.label : "Scoring Δ";

  return (
    <div className="data-card refs-directory">
      <div className="refs-directory-toolbar">
        <div className="refs-directory-toolbar-row">
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
          {isNhl && (
            <NhlMetricToggle metric={nhlMetric} onChange={setNhlMetric} />
          )}
        </div>
        <p className="refs-directory-context">
          {activeTab.description} Over benchmark: {meta.leagueOverBaseline}{" "}
          combined {league.metrics.scoreUnitPlural}.
          {isNhl && nhlMetric === "pim" && " PIM Δ vs league penalty-minute baseline."}
          {isNhl &&
            nhlMetric === "ppo" &&
            " PPO Δ will compare power play chances vs league baseline."}
        </p>
      </div>

      <div className="refs-directory-head" aria-hidden="true">
        <span className="refs-directory-col-rank">#</span>
        <span className="refs-directory-col-official">Official</span>
        <span className="refs-directory-col-games">Games</span>
        <span className="refs-directory-col-over">Over</span>
        <span className="refs-directory-col-delta">{deltaHeader}</span>
      </div>

      <ol className="refs-directory-list">
        {visible.map((ref, index) => {
          const href = `${basePath}/refs/${ref.slug}`;
          const isReveal = expanded && index >= REFS_DIRECTORY_INITIAL_COUNT;
          const nhlDelta = isNhl
            ? nhlDirectoryMetricDelta(ref, nhlMetric)
            : ref.totalPointsDelta;

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
                  {isNhl && nhlDelta === null ? (
                    <span className="refs-directory-delta refs-directory-delta-neutral">
                      —
                    </span>
                  ) : (
                    <DeltaCell
                      delta={nhlDelta ?? ref.totalPointsDelta}
                      unit={unit}
                      overBaseline={meta.leagueOverBaseline}
                      showUnit={!isNhl}
                      heatMap={isNhl}
                    />
                  )}
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
