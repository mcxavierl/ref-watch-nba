"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { ArrowRight, X } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";
import { RefAvatar } from "@/components/RefAvatar";
import { RefJerseyNumber } from "@/components/RefJerseyNumber";
import { WhistleIndexGauge } from "@/components/WhistleIndexGauge";
import {
  OiiInsufficientBadge,
  OiiRadialGauge,
} from "@/components/OiiRadialGauge";
import type { LeagueConfig } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";
import { resolveOiiForRef } from "@/lib/officiating-intelligence-index";
import { whistleIndexFromRefProfile } from "@/lib/whistle-index";
import { formatPct, formatSigned } from "@/lib/stats-utils";

const DRAWER_TRANSITION_MS = 220;
const RECENT_GAME_COUNT = 5;

type RefProfilePreviewDrawerProps = {
  ref: RefProfile | null;
  league: LeagueConfig;
  basePath?: string;
  overBaseline: number;
  open: boolean;
  onClose: () => void;
};

function formatGameDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RefProfilePreviewDrawer({
  ref: profile,
  league,
  basePath = "",
  overBaseline,
  open,
  onClose,
}: RefProfilePreviewDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  const sport =
    league.id === "nhl" ? "nhl" : league.id === "nfl" ? "nfl" : "nba";
  const profileHref = profile ? `${basePath}/refs/${profile.slug}` : "";
  const recentGames = profile?.recentGames.slice(0, RECENT_GAME_COUNT) ?? [];
  const whistleIndex = profile ? whistleIndexFromRefProfile(profile) : null;
  const leagueAvgFouls =
    profile && profile.avgFouls > 0
      ? profile.avgFouls - profile.foulsDelta
      : undefined;
  const oii = profile
    ? resolveOiiForRef(profile, { leagueAvgFouls, preferCache: true })
    : null;

  useEffect(() => {
    if (open) {
      setRendered(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setRendered(false), DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!rendered || !open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rendered, open, onClose]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  if (!rendered || !profile) return null;

  return (
    <ModalPortal>
    <div
      className={`ref-preview-drawer-backdrop${visible ? " ref-preview-drawer-backdrop--visible" : ""}`}
      role="presentation"
      onClick={handleBackdropClick}
    >
      <aside
        ref={panelRef}
        className={`ref-preview-drawer${visible ? " ref-preview-drawer--visible" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-league={league.id}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ref-preview-drawer-header">
          <div className="ref-preview-drawer-header-copy">
            <p className="ref-preview-drawer-kicker">Profile preview</p>
            <div className="ref-preview-drawer-title-row">
              <RefAvatar
                name={profile.name}
                slug={profile.slug}
                sport={sport}
                size="md"
              />
              <div>
                <h2 className="ref-preview-drawer-title" id={titleId}>
                  {profile.name}
                </h2>
                <RefJerseyNumber
                  number={profile.number}
                  className="ref-preview-drawer-number font-mono"
                />
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="ref-preview-drawer-close"
            onClick={onClose}
            aria-label="Close profile preview"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="ref-preview-drawer-body">
          <div className="mb-4 flex flex-wrap gap-3">
            {oii?.status === "ok" ? (
              <OiiRadialGauge result={oii} size="sm" className="min-w-[9rem] flex-1" />
            ) : oii?.status === "insufficient" ? (
              <OiiInsufficientBadge sampleSize={oii.sampleSize} className="min-w-[9rem] flex-1" />
            ) : null}
            {whistleIndex !== null ? (
              <WhistleIndexGauge index={whistleIndex} size="sm" className="min-w-[9rem] flex-1" />
            ) : null}
          </div>
          <dl className="ref-preview-drawer-stats">
            <div>
              <dt>Games</dt>
              <dd className="font-mono tabular-nums">{profile.games}</dd>
            </div>
            <div>
              <dt>Over rate</dt>
              <dd className="font-mono tabular-nums">{formatPct(profile.overRate)}</dd>
            </div>
            <div>
              <dt>Avg combined</dt>
              <dd className="font-mono tabular-nums">{profile.avgTotalPoints}</dd>
            </div>
            <div>
              <dt>Scoring Δ</dt>
              <dd className="font-mono tabular-nums">
                {formatSigned(profile.totalPointsDelta)}
              </dd>
            </div>
          </dl>

          <p className="ref-preview-drawer-meta">
            {profile.seasons.length} season{profile.seasons.length === 1 ? "" : "s"} · Over
            benchmark {overBaseline} {league.metrics.scoreUnitPlural}
          </p>

          <section className="ref-preview-drawer-section" aria-label="Recent games">
            <h3 className="ref-preview-drawer-section-title">Last {RECENT_GAME_COUNT} games</h3>
            {recentGames.length === 0 ? (
              <p className="ref-preview-drawer-empty">No recent games in this sample.</p>
            ) : (
              <div className="ref-preview-drawer-table-wrap">
                <table className="ref-preview-drawer-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Matchup</th>
                      <th scope="col">Total</th>
                      <th scope="col">O/U</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGames.map((game) => (
                      <tr key={game.gameId}>
                        <td className="font-mono tabular-nums">
                          {formatGameDate(game.date)}
                        </td>
                        <td>
                          {game.awayTeam} @ {game.homeTeam}
                        </td>
                        <td className="font-mono tabular-nums">{game.totalPoints}</td>
                        <td>
                          <span
                            className={
                              game.overHit
                                ? "ref-preview-drawer-result--over"
                                : "ref-preview-drawer-result--under"
                            }
                          >
                            {game.overHit ? "Over" : "Under"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <footer className="ref-preview-drawer-footer">
          <Link href={profileHref} className="ref-preview-drawer-profile-link">
            Open full profile
            <ArrowRight size={16} aria-hidden />
          </Link>
        </footer>
      </aside>
    </div>
    </ModalPortal>
  );
}
