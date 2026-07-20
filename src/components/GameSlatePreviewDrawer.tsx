"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { ArrowRight, X } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";
import { OfficialRoleBadge } from "@/components/OfficialRoleBadge";
import { OuLeanBadge } from "@/components/OuLeanBadge";
import { RefAvatar } from "@/components/RefAvatar";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { TeamLogo } from "@/components/TeamLogo";
import { STATE_COLOR_CLASS } from "@/constants/colors";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { RefRole } from "@/lib/types";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { signedDeltaTone } from "@/lib/metric-delight";
import { resolveSlateTeam, slateTeamLogoSport } from "@/lib/slate-team-display";

const DRAWER_TRANSITION_MS = 220;

type GameSlatePreviewDrawerProps = {
  preview: GameSlatePreviewPayload | null;
  open: boolean;
  onClose: () => void;
};

export function GameSlatePreviewDrawer({
  preview,
  open,
  onClose,
}: GameSlatePreviewDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

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

  if (!rendered || !preview) return null;

  const awayTeam = preview.awayAbbr
    ? resolveSlateTeam(preview.leagueId, preview.awayAbbr)
    : null;
  const homeTeam = preview.homeAbbr
    ? resolveSlateTeam(preview.leagueId, preview.homeAbbr)
    : null;
  const sport = slateTeamLogoSport(preview.leagueId);
  const slateHref = `${preview.basePath}#slate-game-${preview.gameId}`;

  return (
    <ModalPortal>
      <div
        className={`ref-preview-drawer-backdrop${visible ? " ref-preview-drawer-backdrop--visible" : ""}`}
        role="presentation"
        onClick={handleBackdropClick}
      >
        <aside
          ref={panelRef}
          className={`ref-preview-drawer game-slate-preview-drawer${visible ? " ref-preview-drawer--visible" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-league={preview.leagueId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="ref-preview-drawer-header">
            <div className="ref-preview-drawer-header-copy">
              <p className="ref-preview-drawer-kicker">
                {preview.leagueLabel} · Game preview
              </p>
              <div className="ref-preview-drawer-title-row">
                <div className="game-slate-preview-matchup">
                  {awayTeam && homeTeam ? (
                    <>
                      <TeamLogo team={awayTeam} sport={sport} size="md" />
                      <span className="game-slate-preview-at" aria-hidden>
                        @
                      </span>
                      <TeamLogo team={homeTeam} sport={sport} size="md" />
                    </>
                  ) : null}
                  <h2 className="ref-preview-drawer-title" id={titleId}>
                    {preview.matchup}
                  </h2>
                </div>
                <OuLeanBadge lean={preview.ouLean} />
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="ref-preview-drawer-close"
              onClick={onClose}
              aria-label="Close game preview"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="ref-preview-drawer-body">
            {preview.crew.length > 0 ? (
              <section className="ref-preview-drawer-section" aria-label="Officiating crew">
                <h3 className="ref-preview-drawer-section-title">Crew</h3>
                <div className="game-slate-preview-crew-row">
                  {preview.crew.map((official) => (
                    <Link
                      key={official.slug}
                      href={`${preview.basePath}/refs/${official.slug}`}
                      className="crew-chip"
                    >
                      <RefAvatar
                        name={official.name}
                        slug={official.slug}
                        sport={preview.sport}
                        size="sm"
                        className="h-6 w-6 text-[9px]"
                      />
                      {official.name}
                      {preview.sport === "nhl" && official.role ? (
                        <OfficialRoleBadge role={official.role as RefRole} />
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ) : (
              <p className="ref-preview-drawer-empty">Crew not assigned yet.</p>
            )}

            {preview.insufficientSample ? (
              <p className="ref-preview-drawer-summary-copy">
                Not enough qualified crew history to show composite tendencies yet.
              </p>
            ) : (
              <dl className="ref-preview-drawer-stats">
                <div className="ref-preview-drawer-stat">
                  <dt>{preview.scoringLabel}</dt>
                  <dd className="font-tabular tabular-nums">
                    <StandoutMetricValue tone="neutral" size="md">
                      {formatSigned(preview.totalPointsDelta)}
                    </StandoutMetricValue>
                    <span className="game-slate-preview-stat-meta">
                      {preview.avgTotalPoints} avg · {formatPct(preview.overRate)} over
                    </span>
                  </dd>
                </div>
                <div className="ref-preview-drawer-stat">
                  <dt>{preview.whistleLabel}</dt>
                  <dd className="font-tabular tabular-nums">
                    <StandoutMetricValue tone="neutral" size="md">
                      {formatSigned(preview.foulsDelta)}
                    </StandoutMetricValue>
                    <span className="game-slate-preview-stat-meta">
                      {preview.avgFouls} avg
                    </span>
                  </dd>
                </div>
                {preview.premiumGap !== undefined ? (
                  <div className="ref-preview-drawer-stat">
                    <dt>Vs benchmark</dt>
                    <dd className="font-tabular tabular-nums">
                      <StandoutMetricValue
                        tone={signedDeltaTone(preview.premiumGap)}
                        size="md"
                      >
                        {formatSigned(preview.premiumGap)}
                      </StandoutMetricValue>
                      {preview.premiumLabel ? (
                        <span className="game-slate-preview-stat-meta">
                          {preview.premiumLabel}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                <div className="ref-preview-drawer-stat">
                  <dt>Sample</dt>
                  <dd className="font-tabular tabular-nums">{preview.sampleGames} games</dd>
                </div>
              </dl>
            )}

            {preview.homeBiasHeadline ? (
              <section className="ref-preview-drawer-summary" aria-label="Home bias">
                <h3 className="ref-preview-drawer-section-title">Home bias</h3>
                <p className="ref-preview-drawer-summary-copy">{preview.homeBiasHeadline}</p>
              </section>
            ) : null}

            {preview.storylines.length > 0 ? (
              <section className="ref-preview-drawer-section" aria-label="Ref history flags">
                <h3 className="ref-preview-drawer-section-title">Outlier flags</h3>
                <ul className="game-slate-preview-storylines">
                  {preview.storylines.map((story) => (
                    <li key={story.headline}>
                      <strong>{story.headline}</strong>
                      <p>{story.summary}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {preview.outlierNotes.length > 0 ? (
              <section className="ref-preview-drawer-section" aria-label="Crew team outliers">
                <h3 className="ref-preview-drawer-section-title">Crew vs teams</h3>
                <ul className="game-slate-preview-outliers">
                  {preview.outlierNotes.map((note) => (
                    <li key={note} className={STATE_COLOR_CLASS.caution}>
                      {note}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {preview.refTeamRows.length > 0 ? (
              <section className="ref-preview-drawer-section" aria-label="Ref team splits">
                <h3 className="ref-preview-drawer-section-title">Ref × team history</h3>
                <div className="ref-preview-drawer-table-wrap">
                  <table className="ref-preview-drawer-table data-table">
                    <thead>
                      <tr>
                        <th scope="col">Official</th>
                        <th scope="col">Team</th>
                        <th scope="col" className="data-table-num">
                          Record
                        </th>
                        <th scope="col" className="data-table-num">
                          Over
                        </th>
                        <th scope="col" className="data-table-num">
                          Fouls Δ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.refTeamRows.map((row) => (
                        <tr
                          key={`${row.refSlug}-${row.teamAbbr}`}
                          className={row.isOutlier ? "game-slate-preview-row--outlier" : undefined}
                        >
                          <td>
                            <Link
                              href={`${preview.basePath}/refs/${row.refSlug}`}
                              className="font-medium hover:underline"
                            >
                              {row.refName}
                            </Link>
                          </td>
                          <td className="font-tabular tabular-nums">{row.teamAbbr}</td>
                          <td className="data-table-num font-tabular tabular-nums">
                            {row.record}
                          </td>
                          <td className="data-table-num font-tabular tabular-nums">
                            {formatPct(row.overRate)}
                          </td>
                          <td
                            className={`data-table-num font-tabular tabular-nums ${row.foulsDelta > 0 ? STATE_COLOR_CLASS.caution : row.foulsDelta < 0 ? STATE_COLOR_CLASS.stable : ""}`}
                          >
                            {formatSigned(row.foulsDelta)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>

          <footer className="ref-preview-drawer-footer">
            <Link href={slateHref} className="ref-preview-drawer-profile-link">
              Open full slate card
              <ArrowRight size={16} aria-hidden />
            </Link>
          </footer>
        </aside>
      </div>
    </ModalPortal>
  );
}
