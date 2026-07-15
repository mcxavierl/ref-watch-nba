"use client";

import { useCallback, useEffect, useId, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { fetchInsightDrilldown } from "@/lib/insight-drilldown-fetch";
import type {
  InsightDrilldownPayload,
  InsightVenueSplit,
} from "@/lib/insight-drilldown-types";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { formatPct } from "@/lib/stats-utils";
import { EMPTY_DISPLAY } from "@/lib/finding-copy";

type VenueFilter = "all" | "home" | "away";

const MODAL_TRANSITION_MS = 200;

type InsightDrilldownModalProps = {
  card: LeagueInsightCard;
  open: boolean;
  onClose: () => void;
};

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

export function InsightDrilldownModal({
  card,
  open,
  onClose,
}: InsightDrilldownModalProps) {
  const titleId = useId();
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<InsightDrilldownPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venue, setVenue] = useState<VenueFilter>("all");

  useEffect(() => {
    if (open) {
      setRendered(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setRendered(false), MODAL_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !card.drilldownId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setVenue("all");

    fetchInsightDrilldown(card.drilldownId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError("Could not load matchup history.");
          setPayload(null);
          return;
        }
        setPayload(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load matchup history.");
          setPayload(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [card.drilldownId, open]);

  useEffect(() => {
    if (!rendered) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rendered, onClose]);

  const homeGameCount =
    payload?.games.filter((game) => game.isHome).length ?? 0;
  const awayGameCount =
    payload?.games.filter((game) => !game.isHome).length ?? 0;

  const filteredGames =
    payload?.games.filter((game) => {
      if (venue === "home") return game.isHome;
      if (venue === "away") return !game.isHome;
      return true;
    }) ?? [];

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

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

  if (!rendered) return null;

  const modal = (
    <div
      className={[
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm",
        "insight-drilldown-backdrop",
        visible ? "insight-drilldown-backdrop--visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className={`insight-drilldown-modal${visible ? " insight-drilldown-modal--visible" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-league={card.leagueId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="insight-drilldown-header">
          <div className="insight-drilldown-header-copy">
            <p className="insight-drilldown-kicker">{card.kicker}</p>
            <h2 className="insight-drilldown-title" id={titleId}>
              {payload?.refName ?? card.entityName ?? "Official"} ×{" "}
              {payload?.teamLabel ?? card.teamLabel ?? "Team"}
            </h2>
          </div>
          <button
            type="button"
            className="insight-drilldown-close"
            onClick={onClose}
            aria-label="Close drill-down"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        {loading ? (
          <p className="insight-drilldown-status">Loading matchup history…</p>
        ) : error ? (
          <p className="insight-drilldown-status insight-drilldown-status--error">
            {error}
          </p>
        ) : payload ? (
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

            <section className="insight-drilldown-section" aria-label="Recent games">
              <div className="insight-drilldown-section-head">
                <h3 className="insight-drilldown-section-title">Last {payload.games.length} games</h3>
                <p className="insight-drilldown-section-lead">
                  {payload.games.length < payload.wins + payload.losses
                    ? `Showing ${payload.games.length} of ${payload.wins + payload.losses} ref×team games available in the profile sample.`
                    : venue === "all"
                      ? "Most recent matchups in this sample."
                      : venue === "home"
                        ? "Home games in this ref×team sample."
                        : "Road games in this ref×team sample."}
                </p>
              </div>
              <div className="insight-drilldown-table-wrap">
                <table className="insight-drilldown-table">
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
                        {payload.games[0]?.whistleLabel ?? "Whistle"}
                      </th>
                      <th
                        scope="col"
                        className="insight-drilldown-col--spread hidden tracking-tight px-2 py-2 md:table-cell sm:px-3 sm:py-2.5"
                      >
                        Spread
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGames.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="insight-drilldown-empty">
                          No games in this venue filter.
                        </td>
                      </tr>
                    ) : (
                      filteredGames.map((game) => (
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
                            {game.whistleCount}
                          </td>
                          <td className="insight-drilldown-col--spread hidden tracking-tight px-2 py-2 md:table-cell sm:px-3 sm:py-2.5">
                            {formatSpreadResult(game.spreadCovered)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
