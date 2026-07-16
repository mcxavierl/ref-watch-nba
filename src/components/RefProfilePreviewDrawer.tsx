"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ArrowRight, X } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";
import { RefAvatar } from "@/components/RefAvatar";
import { RefJerseyNumber } from "@/components/RefJerseyNumber";
import { RefProfilePreviewSparkline } from "@/components/RefProfilePreviewSparkline";
import { WhistleIndexGauge } from "@/components/WhistleIndexGauge";
import {
  OiiInsufficientBadge,
  OiiRadialGauge,
} from "@/components/OiiRadialGauge";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import type { LeagueConfig, LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";
import {
  buildRefPreviewQuickSummary,
  buildWhistleSparklineSeries,
  metricHonestyHint,
  PREVIEW_RECENT_GAME_COUNT,
} from "@/lib/ref-profile-preview";
import { resolveOiiForRef } from "@/lib/officiating-intelligence-index";
import { whistleIndexFromRefProfile } from "@/lib/whistle-index";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { signedDeltaTone } from "@/lib/metric-delight";
import { StandoutMetricValue } from "@/components/StandoutMetric";

const DRAWER_TRANSITION_MS = 220;

type RefProfilePreviewDrawerProps = {
  ref: RefProfile | null;
  league: LeagueConfig;
  basePath?: string;
  overBaseline: number;
  open: boolean;
  onClose: () => void;
};

function avatarSportForLeague(
  leagueId: LeagueId,
): "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" {
  if (leagueId === "nhl") return "nhl";
  if (leagueId === "nfl") return "nfl";
  if (leagueId === "epl") return "epl";
  if (leagueId === "laliga") return "laliga";
  if (leagueId === "cbb") return "cbb";
  if (leagueId === "cfb") return "cfb";
  return "nba";
}

function formatGameDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PreviewMetricStat({
  label,
  value,
  hint,
  valueTone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint: string;
  valueTone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="ref-preview-drawer-stat">
      <dt>
        <MetricInfoHint hint={hint}>{label}</MetricInfoHint>
      </dt>
      <dd className="font-mono tabular-nums">
        {typeof value === "string" || typeof value === "number" ? (
          <StandoutMetricValue tone={valueTone} size="md">
            {value}
          </StandoutMetricValue>
        ) : (
          value
        )}
      </dd>
    </div>
  );
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

  const sport = avatarSportForLeague(league.id);
  const profileHref = profile ? `${basePath}/refs/${profile.slug}` : "";

  const previewModel = useMemo(() => {
    if (!profile) return null;

    const recentGames = profile.recentGames.slice(0, PREVIEW_RECENT_GAME_COUNT);
    const leagueAvgFouls =
      profile.avgFouls > 0 ? profile.avgFouls - profile.foulsDelta : undefined;
    const leagueAvgTotal =
      profile.avgTotalPoints > 0
        ? profile.avgTotalPoints - profile.totalPointsDelta
        : overBaseline;

    const whistleIndex = whistleIndexFromRefProfile(profile);
    const oii = resolveOiiForRef(profile, { leagueAvgFouls, preferCache: true });
    const sparkline = buildWhistleSparklineSeries(recentGames, league);
    const quickSummary = buildRefPreviewQuickSummary({
      profile,
      league,
      leagueAvgFouls: leagueAvgFouls ?? profile.avgFouls,
      leagueAvgTotal,
    });

    const gamesHint = metricHonestyHint({
      sampleSize: profile.games,
      effectMagnitude: profile.foulsDelta,
    });
    const whistleHint = metricHonestyHint({
      sampleSize: profile.games,
      leagueAvg: leagueAvgFouls,
      leagueAvgLabel: `${league.metrics.whistleShort} league avg`,
      effectMagnitude: profile.foulsDelta,
    });
    const overHint = metricHonestyHint({
      sampleSize: profile.games,
      leagueAvg: overBaseline,
      leagueAvgLabel: "Over benchmark",
      effectMagnitude: profile.overRate - 0.5,
    });
    const scoringHint = metricHonestyHint({
      sampleSize: profile.games,
      leagueAvg: leagueAvgTotal,
      leagueAvgLabel: `${league.metrics.scoreUnit} league avg`,
      effectMagnitude: profile.totalPointsDelta,
    });
    const scoringDeltaTone = signedDeltaTone(profile.totalPointsDelta);

    return {
      recentGames,
      leagueAvgFouls,
      leagueAvgTotal,
      whistleIndex,
      oii,
      sparkline,
      quickSummary,
      gamesHint,
      whistleHint,
      overHint,
      scoringHint,
      scoringDeltaTone,
    };
  }, [profile, league, overBaseline]);

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

  if (!rendered || !profile || !previewModel) return null;

  const whistleHintCopy = metricHonestyHint({
    sampleSize: profile.games,
    leagueAvg: previewModel.leagueAvgFouls,
    leagueAvgLabel: "Whistle Index baseline",
    effectMagnitude: profile.foulsDelta,
  });

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
              <p className="ref-preview-drawer-kicker">{league.label} · Profile preview</p>
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
                  <p className="ref-preview-drawer-league m-0 text-xs text-primary-muted">
                    {league.shortLabel} official
                  </p>
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
            <div className="ref-preview-drawer-index-row">
              {previewModel.oii?.status === "ok" ? (
                <OiiRadialGauge
                  result={previewModel.oii}
                  size="sm"
                  className="ref-preview-drawer-index-card"
                />
              ) : previewModel.oii?.status === "insufficient" ? (
                <OiiInsufficientBadge
                  sampleSize={previewModel.oii.sampleSize}
                  className="ref-preview-drawer-index-card"
                />
              ) : null}
              {previewModel.whistleIndex !== null ? (
                <div className="ref-preview-drawer-index-card">
                  <MetricInfoHint hint={whistleHintCopy}>
                    <WhistleIndexGauge
                      index={previewModel.whistleIndex}
                      size="sm"
                      className="h-full"
                    />
                  </MetricInfoHint>
                </div>
              ) : null}
            </div>

            <section className="ref-preview-drawer-summary" aria-label="Quick summary">
              <h3 className="ref-preview-drawer-section-title">Quick summary</h3>
              <p className="ref-preview-drawer-summary-copy">{previewModel.quickSummary}</p>
            </section>

            <dl className="ref-preview-drawer-stats">
              <PreviewMetricStat
                label="Games"
                value={profile.games}
                hint={previewModel.gamesHint}
              />
              <PreviewMetricStat
                label={`${league.metrics.whistleShort}/game`}
                value={profile.avgFouls}
                hint={previewModel.whistleHint}
              />
              <PreviewMetricStat
                label="Over rate"
                value={formatPct(profile.overRate)}
                hint={previewModel.overHint}
              />
              <PreviewMetricStat
                label="Scoring Δ"
                value={formatSigned(profile.totalPointsDelta)}
                hint={previewModel.scoringHint}
                valueTone={previewModel.scoringDeltaTone}
              />
            </dl>

            <section
              className="ref-preview-drawer-section"
              aria-label="Whistle volatility sparkline"
            >
              <h3 className="ref-preview-drawer-section-title">
                {league.metrics.whistleShort} volatility · last {PREVIEW_RECENT_GAME_COUNT} games
              </h3>
              <RefProfilePreviewSparkline
                points={previewModel.sparkline}
                leagueAvg={previewModel.leagueAvgFouls}
                unitLabel={league.metrics.whistleShort}
              />
            </section>

            <section className="ref-preview-drawer-section" aria-label="Recent games">
              <h3 className="ref-preview-drawer-section-title">
                Last {PREVIEW_RECENT_GAME_COUNT} games
              </h3>
              {previewModel.recentGames.length === 0 ? (
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
                      {previewModel.recentGames.map((game) => (
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
