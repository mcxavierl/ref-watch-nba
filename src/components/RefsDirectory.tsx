"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import { RefJerseyNumber } from "@/components/RefJerseyNumber";
import { RefProfilePreviewDrawer } from "@/components/RefProfilePreviewDrawer";
import { RefsTrendSpotlight } from "@/components/RefsTrendSpotlight";
import {
  buildRefsDirectoryPreviewRows,
  buildRefsSpotlightCards,
  directoryDeltaTone,
  filterRefsDiscovery,
  formatDirectoryDelta,
  NFL_DIRECTORY_METRICS,
  NHL_DIRECTORY_METRICS,
  nflDirectoryMetricDelta,
  nhlDirectoryMetricDisplay,
  REFS_DIRECTORY_TABS,
  sortRefsByOutlierDeviation,
  sortRefsDirectory,
  type NflDirectoryMetric,
  type NhlDirectoryMetric,
  type RefsDirectoryMeta,
  type RefsDirectoryTab,
} from "@/lib/refs-directory";
import type { LeagueConfig } from "@/lib/leagues";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { RefProfile } from "@/lib/types";

function performanceRankTier(rank: number): "top" | "middle" | "bottom" | null {
  if (rank >= 1 && rank <= 10) return "top";
  if (rank >= 11 && rank <= 15) return "middle";
  if (rank >= 16 && rank <= 25) return "bottom";
  return null;
}

function DeltaCell({
  delta,
  unit,
  overBaseline,
  showUnit = true,
  heatMap = false,
  formatted,
  usePct = false,
  rankTier = null,
}: {
  delta: number;
  unit: string;
  overBaseline: number;
  showUnit?: boolean;
  heatMap?: boolean;
  formatted?: string;
  usePct?: boolean;
  rankTier?: "top" | "middle" | "bottom" | null;
}) {
  const formattedValue =
    formatted ??
    (showUnit ? formatSigned(delta) : formatDirectoryDelta(delta));

  if (rankTier === "top") {
    return (
      <span className="refs-directory-delta refs-directory-delta-rank-top tabular-nums">
        {formattedValue}
        {showUnit ? ` ${unit}` : ""}
      </span>
    );
  }
  if (rankTier === "middle") {
    return (
      <span className="refs-directory-delta refs-directory-delta-rank-middle tabular-nums">
        {formattedValue}
        {showUnit ? ` ${unit}` : ""}
      </span>
    );
  }
  if (rankTier === "bottom") {
    return (
      <span className="refs-directory-delta refs-directory-delta-rank-bottom tabular-nums">
        {formattedValue}
        {showUnit ? ` ${unit}` : ""}
      </span>
    );
  }

  const tone = directoryDeltaTone(delta, overBaseline, heatMap, usePct);
  const className =
    tone === "positive"
      ? "refs-directory-delta ref-delta-positive"
      : tone === "negative"
        ? "refs-directory-delta ref-delta-negative"
        : "refs-directory-delta refs-directory-delta-neutral";

  return (
    <span className={`refs-directory-delta ${className} tabular-nums`}>
      {formattedValue}
      {showUnit ? ` ${unit}` : ""}
    </span>
  );
}

function OverGauge({ overRate }: { overRate: number }) {
  const fill = Math.round(Math.min(100, Math.max(0, overRate * 100)));
  return (
    <div
      className="refs-directory-over-gauge"
      style={{ "--over-fill": `${fill}%` } as CSSProperties}
    >
      <span className="refs-directory-over-gauge-fill" aria-hidden />
      <span className="refs-directory-over-gauge-value font-tabular">
        {formatPct(overRate)}
      </span>
    </div>
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

function NflMetricToggle({
  metric,
  onChange,
}: {
  metric: NflDirectoryMetric;
  onChange: (metric: NflDirectoryMetric) => void;
}) {
  return (
    <div
      className="refs-directory-metric-toggle"
      role="group"
      aria-label="NFL delta metric"
    >
      {NFL_DIRECTORY_METRICS.map((item) => {
        const isActive = item.id === metric;
        return (
          <button
            key={item.id}
            type="button"
            className={`refs-directory-metric-btn ${isActive ? "refs-directory-metric-btn-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function leagueSport(
  leagueId: LeagueConfig["id"],
): "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" {
  if (leagueId === "nhl") return "nhl";
  if (leagueId === "nfl") return "nfl";
  if (leagueId === "epl") return "epl";
  if (leagueId === "laliga") return "laliga";
  if (leagueId === "cbb") return "cbb";
  if (leagueId === "cfb") return "cfb";
  return "nba";
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
  const [nflMetric, setNflMetric] = useState<NflDirectoryMetric>("flags");
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [outliersOnly, setOutliersOnly] = useState(false);
  const [previewRef, setPreviewRef] = useState<RefProfile | null>(null);

  const activeTab = REFS_DIRECTORY_TABS.find((t) => t.id === tab)!;
  const sport = leagueSport(league.id);

  const sorted = useMemo(() => sortRefsDirectory(refs, tab), [refs, tab]);

  const discovered = useMemo(() => {
    let pool = filterRefsDiscovery(sorted, {
      query: discoveryQuery,
      outliersOnly,
      pool: refs,
    });
    if (outliersOnly) {
      pool = sortRefsByOutlierDeviation(pool);
    }
    return pool;
  }, [sorted, discoveryQuery, outliersOnly, refs]);

  const spotlightCards = useMemo(
    () => buildRefsSpotlightCards(refs, tab, meta, league, basePath),
    [refs, tab, meta, league, basePath],
  );

  const visible = useMemo(
    () => buildRefsDirectoryPreviewRows(discovered, expanded),
    [discovered, expanded],
  );
  const hasMore = !expanded && visible.length < discovered.length;
  const unit = league.metrics.scoreUnit;
  const isNhl = league.id === "nhl";
  const isNfl = league.id === "nfl";
  const officialLabel =
    discovered.length === 1 ? league.officialNoun : league.officialNounPlural;
  const activeNhlMetric = NHL_DIRECTORY_METRICS.find((m) => m.id === nhlMetric)!;
  const activeNflMetric = NFL_DIRECTORY_METRICS.find((m) => m.id === nflMetric)!;
  const deltaHeader = isNhl
    ? activeNhlMetric.label
    : isNfl
      ? activeNflMetric.label
      : "Scoring Δ";

  return (
    <div className="refs-directory-hub">
      <RefsTrendSpotlight cards={spotlightCards} tabLabel={activeTab.label} />

      <div className="ref-profile-section refs-directory">
        <div className="refs-directory-toolbar">
          <div className="refs-directory-discovery-head">
            <p className="refs-directory-discovery-title">Officials performance</p>
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
          </div>

          <div className="refs-directory-discovery-filters">
            <label className="refs-directory-search">
              <span className="sr-only">Search officials</span>
              <input
                type="search"
                className="refs-directory-search-input"
                placeholder="Search by name..."
                value={discoveryQuery}
                onChange={(event) => {
                  setDiscoveryQuery(event.target.value);
                  setExpanded(false);
                }}
              />
            </label>
            <label className="refs-directory-outlier-toggle">
              <input
                type="checkbox"
                checked={outliersOnly}
                onChange={(event) => {
                  setOutliersOnly(event.target.checked);
                  setExpanded(false);
                }}
              />
              Whistle outliers
              <span className="refs-directory-outlier-hint">
                Over-rate or origin-variance
              </span>
            </label>
          </div>

          <div className="refs-directory-toolbar-row">
            {isNhl && (
              <NhlMetricToggle metric={nhlMetric} onChange={setNhlMetric} />
            )}
            {isNfl && (
              <NflMetricToggle metric={nflMetric} onChange={setNflMetric} />
            )}
          </div>

          <p className="refs-directory-context">
            {activeTab.description} Over benchmark: {meta.leagueOverBaseline}{" "}
            combined {league.metrics.scoreUnitPlural}.
            {isNhl && nhlMetric === "goals" && " Scoring vs avg shows % above/below league combined goals."}
            {isNhl && nhlMetric === "pim" && " PIM vs avg shows % above/below league penalty-minute baseline."}
            {isNhl &&
              nhlMetric === "ppo" &&
              " PPO vs avg will compare power play chances vs league baseline."}
            {isNfl && nflMetric === "flags" && " Flags Δ vs league average per game."}
            {isNfl &&
              nflMetric === "penaltyYards" &&
              " Penalty yards Δ vs league average."}
          </p>
        </div>

        <div className="refs-directory-head" aria-hidden="true">
          <span className="refs-directory-col-rank">#</span>
          <span className="refs-directory-col-official">Official</span>
          <span className="refs-directory-col-games">Games</span>
          <span className="refs-directory-col-over">O/U%</span>
          <span className="refs-directory-col-delta">{deltaHeader}</span>
        </div>

        {visible.length === 0 ? (
          <p className="refs-directory-empty">
            No officials match your filters. Clear search or disable whistle outliers.
          </p>
        ) : (
          <ol className="refs-directory-list">
            {visible.map(({ ref, rank }, index) => {
              const rankTier = performanceRankTier(rank);
              const resumesBottomTier =
                !expanded && rank === 16 && index > 0;
              const nhlDisplay = isNhl
                ? nhlDirectoryMetricDisplay(
                    ref,
                    nhlMetric,
                    meta.leagueAvgTotal,
                    meta.leagueAvgFouls,
                  )
                : null;
              const nflDelta = isNfl
                ? nflDirectoryMetricDelta(ref, nflMetric)
                : null;
              const displayDelta =
                nhlDisplay?.value ?? nflDelta ?? ref.totalPointsDelta;
              const displayFormatted = nhlDisplay?.formatted;
              const usePct = isNhl && nhlDisplay?.usePct === true;

              return (
                <li
                  key={ref.slug}
                  className={`refs-directory-row${rankTier ? ` refs-directory-row--${rankTier}` : ""}${resumesBottomTier ? " refs-directory-row--bottom-resume" : ""}${expanded && index >= 20 ? " refs-directory-row-reveal" : ""}`}
                >
                  <div className="refs-directory-row-link">
                    <span className="refs-directory-col-rank font-tabular tabular-nums">
                      {rank}
                    </span>
                    <span className="refs-directory-col-official">
                      <RefAvatar
                        name={ref.name}
                        slug={ref.slug}
                        sport={sport}
                        size="sm"
                        className="refs-directory-avatar"
                      />
                      <span className="refs-directory-name-wrap">
                        <button
                          type="button"
                          className="refs-directory-name refs-directory-name-button"
                          onClick={() => setPreviewRef(ref)}
                        >
                          {ref.name}
                        </button>
                        <RefJerseyNumber
                          number={ref.number}
                          className="refs-directory-number font-tabular"
                        />
                      </span>
                    </span>
                    <span className="refs-directory-col-games font-tabular tabular-nums">
                      {ref.games}
                    </span>
                    <span className="refs-directory-col-over">
                      <OverGauge overRate={ref.overRate} />
                    </span>
                    <span className="refs-directory-col-delta">
                      {(isNhl && nhlDisplay === null) ||
                      (isNfl && nflDelta === null) ? (
                        <span className="refs-directory-delta refs-directory-delta-neutral tabular-nums">
                          -
                        </span>
                      ) : (
                        <DeltaCell
                          delta={displayDelta}
                          unit={unit}
                          overBaseline={meta.leagueOverBaseline}
                          showUnit={!isNhl && !isNfl}
                          heatMap={isNhl || isNfl}
                          formatted={displayFormatted}
                          usePct={usePct}
                          rankTier={rankTier}
                        />
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {hasMore && !expanded && (
          <div className="refs-directory-expand-wrap">
            <button
              type="button"
              className="refs-directory-expand-btn"
              onClick={() => setExpanded(true)}
            >
              Show all {discovered.length} {officialLabel}
            </button>
          </div>
        )}
      </div>

      <RefProfilePreviewDrawer
        ref={previewRef}
        league={league}
        basePath={basePath}
        overBaseline={meta.leagueOverBaseline}
        open={previewRef !== null}
        onClose={() => setPreviewRef(null)}
      />
    </div>
  );
}
