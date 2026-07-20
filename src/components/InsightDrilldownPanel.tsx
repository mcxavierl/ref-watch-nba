"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessibleHeaderTooltip } from "@/components/shared/AccessibleHeaderTooltip";
import { IntensityBadge } from "@/components/shared/IntensityBadge";
import { EMPTY_DISPLAY } from "@/lib/finding-copy";
import {
  hiddenInsightDrilldownGameCount,
  insightDrilldownExpandLabel,
  insightDrilldownHasSpreadData,
  visibleInsightDrilldownGames,
} from "@/lib/insight-drilldown-preview";
import type {
  InsightDrilldownPayload,
  InsightVenueSplit,
} from "@/lib/insight-drilldown-types";
import { FOULS_COLUMN_TOOLTIP, getIntensityLabel } from "@/lib/match-intensity";
import { formatPct } from "@/lib/stats-utils";

type VenueFilter = "all" | "home" | "away";

function toneClass(tone: InsightDrilldownPayload["heroTone"]): string {
  if (tone === "positive") return "insight-drilldown-hero--positive";
  if (tone === "negative") return "insight-drilldown-hero--negative";
  return "insight-drilldown-hero--neutral";
}

function formatWinRate(split: InsightVenueSplit): string {
  if (split.games === 0 || split.winRate === null) return EMPTY_DISPLAY;
  return formatPct(split.winRate);
}

function formatSpreadResult(covered: boolean | null): string {
  if (covered === null) return EMPTY_DISPLAY;
  return covered ? "Cover" : "No cover";
}

function formatGameDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type InsightDrilldownPanelProps = {
  payload: InsightDrilldownPayload;
  titleId: string;
  /** Defaults to "Last {n} games". */
  gamesSectionTitle?: string;
};

export function InsightDrilldownPanel({
  payload,
  titleId,
  gamesSectionTitle,
}: InsightDrilldownPanelProps) {
  const [venue, setVenue] = useState<VenueFilter>("all");
  const [gamesExpanded, setGamesExpanded] = useState(false);

  const homeGameCount =
    payload.games.filter((game) => game.isHome).length;
  const awayGameCount =
    payload.games.filter((game) => !game.isHome).length;

  const filteredGames = payload.games.filter((game) => {
    if (venue === "home") return game.isHome;
    if (venue === "away") return !game.isHome;
    return true;
  });

  useEffect(() => {
    setGamesExpanded(false);
  }, [venue]);

  const visibleGames = useMemo(
    () => visibleInsightDrilldownGames(filteredGames, gamesExpanded),
    [filteredGames, gamesExpanded],
  );
  const hiddenGameCount = hiddenInsightDrilldownGameCount(
    filteredGames,
    gamesExpanded,
  );
  const showSpreadColumn = insightDrilldownHasSpreadData(payload.games);
  const gameTableColumnCount = showSpreadColumn ? 6 : 5;

  const venueTabState = (
    value: VenueFilter,
  ): { disabled: boolean; empty: boolean } => {
    if (value === "home") {
      return { disabled: homeGameCount === 0, empty: homeGameCount === 0 };
    }
    if (value === "away") {
      return { disabled: awayGameCount === 0, empty: awayGameCount === 0 };
    }
    return { disabled: false, empty: false };
  };

  const sectionTitle =
    gamesSectionTitle ?? `Last ${payload.games.length} games`;

  return (
    <div className="insight-drilldown-body">
      <div className={`insight-drilldown-hero ${toneClass(payload.heroTone)}`}>
        <span className="insight-drilldown-hero-value">{payload.heroValue}</span>
        <span className="insight-drilldown-hero-label">{payload.heroLabel}</span>
        <p className="insight-drilldown-hero-meta">
          {payload.wins}-{payload.losses} ({formatPct(payload.winRate)}) in this
          ref×team sample · Team baseline {formatPct(payload.baselineWinRate)}
        </p>
      </div>

      <section className="insight-drilldown-section" aria-label="Venue splits">
        <div className="insight-drilldown-venue-tabs" role="tablist">
          {(
            [
              ["all", "All games"],
              ["home", "Home"],
              ["away", "Away"],
            ] as const
          ).map(([value, label]) => {
            const { disabled, empty } = venueTabState(value);
            const active = venue === value;

            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={disabled || undefined}
                disabled={disabled}
                className={[
                  "insight-drilldown-venue-tab",
                  active ? "insight-drilldown-venue-tab--active" : "",
                  empty ? "insight-drilldown-venue-tab--empty" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (!disabled) setVenue(value);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="insight-drilldown-venue-grid">
          <div className="insight-drilldown-venue-card">
            <span className="insight-drilldown-venue-label">Home</span>
            <strong>
              {payload.homeSplit.wins}-{payload.homeSplit.losses}
            </strong>
            <span>{formatWinRate(payload.homeSplit)}</span>
          </div>
          <div className="insight-drilldown-venue-card">
            <span className="insight-drilldown-venue-label">Away</span>
            <strong>
              {payload.awaySplit.wins}-{payload.awaySplit.losses}
            </strong>
            <span>{formatWinRate(payload.awaySplit)}</span>
          </div>
        </div>
      </section>

      <section className="insight-drilldown-section" aria-label="Games">
        <div className="insight-drilldown-section-head">
          <h3 className="insight-drilldown-section-title">{sectionTitle}</h3>
          <p className="insight-drilldown-section-lead">
            {payload.games.length < payload.wins + payload.losses
              ? `Showing ${payload.games.length} of ${payload.wins + payload.losses} ref×team games available in the profile sample.`
              : venue === "all"
                ? "Every verified game in this ref×team sample."
                : venue === "home"
                  ? "Home games in this ref×team sample."
                  : "Road games in this ref×team sample."}
          </p>
        </div>
        <div className="insight-drilldown-table-wrap">
          <table
            className="insight-drilldown-table"
            id={`${titleId}-games-table`}
          >
            <thead>
              <tr>
                <th scope="col" className="tracking-tight px-2 py-2 sm:px-3 sm:py-2.5">
                  Date
                </th>
                <th
                  scope="col"
                  className="insight-drilldown-col--venue hidden tracking-tight px-2 py-2 sm:table-cell sm:px-3 sm:py-2.5"
                >
                  Venue
                </th>
                <th scope="col" className="tracking-tight px-2 py-2 sm:px-3 sm:py-2.5">
                  Opponent
                </th>
                <th scope="col" className="tracking-tight px-2 py-2 sm:px-3 sm:py-2.5">
                  Score
                </th>
                <th scope="col" className="tracking-tight px-2 py-2 sm:px-3 sm:py-2.5">
                  <AccessibleHeaderTooltip
                    label={payload.games[0]?.whistleLabel ?? "Fouls"}
                    tooltip={FOULS_COLUMN_TOOLTIP}
                  />
                </th>
                {showSpreadColumn ? (
                  <th
                    scope="col"
                    className="insight-drilldown-col--spread hidden tracking-tight px-2 py-2 md:table-cell sm:px-3 sm:py-2.5"
                  >
                    Spread
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filteredGames.length === 0 ? (
                <tr>
                  <td colSpan={gameTableColumnCount} className="insight-drilldown-empty">
                    No games in this venue filter.
                  </td>
                </tr>
              ) : (
                visibleGames.map((game) => (
                  <tr key={game.gameId}>
                    <td className="tracking-tight px-2 py-2 sm:px-3 sm:py-2.5">
                      {formatGameDate(game.date)}
                    </td>
                    <td className="insight-drilldown-col--venue hidden tracking-tight px-2 py-2 sm:table-cell sm:px-3 sm:py-2.5">
                      {game.isHome ? "Home" : "Away"}
                    </td>
                    <td className="insight-drilldown-col--opponent tracking-tight px-2 py-2 sm:px-3 sm:py-2.5">
                      <span className="insight-drilldown-opponent-label">
                        {game.opponentLabel}
                      </span>
                      <span className="insight-drilldown-opponent-venue sm:hidden">
                        {game.isHome ? "Home" : "Away"}
                      </span>
                    </td>
                    <td className="tracking-tight px-2 py-2 sm:px-3 sm:py-2.5">
                      <span
                        className={
                          game.teamWon
                            ? "insight-drilldown-result--win"
                            : "insight-drilldown-result--loss"
                        }
                      >
                        {game.scoreLine}
                      </span>
                    </td>
                    <td className="tracking-tight px-2 py-2 sm:px-3 sm:py-2.5">
                      <span className="insight-drilldown-fouls-cell tabular-nums">
                        {game.whistleCount}
                        {getIntensityLabel(
                          game.whistleCount,
                          payload.leagueAvgFouls,
                        ) !== "Standard" ? (
                          <IntensityBadge
                            foulCount={game.whistleCount}
                            leagueAvgFouls={payload.leagueAvgFouls}
                            compact
                          />
                        ) : null}
                      </span>
                    </td>
                    {showSpreadColumn ? (
                      <td className="insight-drilldown-col--spread hidden tracking-tight px-2 py-2 md:table-cell sm:px-3 sm:py-2.5">
                        {formatSpreadResult(game.spreadCovered)}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hiddenGameCount > 0 ? (
          <div className="insight-drilldown-view-more">
            <button
              type="button"
              className="insight-drilldown-view-more-btn rw-focus-ring"
              aria-expanded={gamesExpanded}
              aria-controls={`${titleId}-games-table`}
              onClick={() => setGamesExpanded((value) => !value)}
            >
              {insightDrilldownExpandLabel(hiddenGameCount, gamesExpanded)}
            </button>
          </div>
        ) : null}
      </section>

      {payload.crewPartners.length > 0 ? (
        <section className="insight-drilldown-section" aria-label="Crew context">
          <h3 className="insight-drilldown-section-title">Regular crew partners</h3>
          <ul className="insight-drilldown-crew-list">
            {payload.crewPartners.map((partner) => (
              <li key={partner.name}>
                <span>{partner.name}</span>
                <span>{partner.games} games</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
