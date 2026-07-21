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
import { TrendingDown, TrendingUp, X } from "lucide-react";
import { MatchupInsightCard } from "@/components/MatchupInsightCard";
import { EvidenceDrawer } from "@/components/evidence/EvidenceDrawer";
import { ModalPortal } from "@/components/ModalPortal";
import { OfficialRoleBadge } from "@/components/OfficialRoleBadge";
import { OuLeanBadge } from "@/components/OuLeanBadge";
import { RefAvatar } from "@/components/RefAvatar";
import { TeamImpactCard } from "@/components/TeamImpactCard";
import { TeamLogo } from "@/components/TeamLogo";
import { STATE_COLOR_CLASS } from "@/constants/colors";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildGameSlateMatchupInsights,
  refVsTeamsSectionLabel,
} from "@/lib/game-slate-matchup-insights";
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

function crewImpactToneClass(tone: "positive" | "negative" | "neutral"): string {
  if (tone === "positive") return STATE_COLOR_CLASS.stable;
  if (tone === "negative") return STATE_COLOR_CLASS.risk;
  return STATE_COLOR_CLASS.neutral;
}

function foulsDeltaClass(delta: number): string {
  if (delta > 0) return STATE_COLOR_CLASS.caution;
  if (delta < 0) return STATE_COLOR_CLASS.stable;
  return "";
}

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
  const scoringTone = signedDeltaTone(preview.totalPointsDelta);
  const whistleTone = signedDeltaTone(preview.foulsDelta);
  const rowsByTeam = new Map(
    preview.teamImpacts.map((impact) => [
      impact.teamAbbr,
      preview.refTeamRows.filter((row) => row.teamAbbr === impact.teamAbbr),
    ]),
  );
  const matchupInsights = buildGameSlateMatchupInsights(preview.refTeamRows);
  const refVsTeamsLabel = refVsTeamsSectionLabel(preview.crew.length);
  const projectionEvidence = buildProjectionEvidence(preview);
  const awaitingCrew = preview.awaitingCrew ?? preview.crew.length === 0;
  const briefing = preview.matchupBriefing;
  const drawerKicker = awaitingCrew
    ? `${preview.leagueLabel} · Matchup sheet`
    : `${preview.leagueLabel} · Game preview`;
  const impactSectionTitle = awaitingCrew ? "Head-to-head profile" : "Crew impact";
  const impactSampleLabel = awaitingCrew
    ? `${preview.sampleGames} head-to-head meetings`
    : `${preview.sampleGames} games in sample`;
  const insufficientCopy = awaitingCrew
    ? "Limited head-to-head history for this pairing. Context below uses recent team form and slate notes."
    : "Not enough qualified crew history to show composite tendencies yet.";

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
                {drawerKicker}
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
            {awaitingCrew ? (
              <section
                className="ref-preview-drawer-section game-slate-preview-matchup-briefing"
                aria-label="Matchup briefing"
              >
                <h3 className="ref-preview-drawer-section-title">
                  {briefing?.headline ?? "Matchup briefing"}
                </h3>
                <p className="game-slate-preview-matchup-briefing-note">
                  Officiating crew not assigned yet. Ref intelligence unlocks when the slate is
                  published.
                </p>
                {briefing?.lines.length ? (
                  <ul className="game-slate-preview-matchup-briefing-lines">
                    {briefing.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : (
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
            )}

            <div className="flex flex-col gap-6">
              {preview.insufficientSample ? (
                <p className="ref-preview-drawer-summary-copy">{insufficientCopy}</p>
              ) : (
                <section className="game-slate-preview-crew-impact" aria-label={impactSectionTitle}>
                  <h3 className="ref-preview-drawer-section-title">{impactSectionTitle}</h3>
                  <div className="game-slate-preview-crew-impact-chips">
                    <div
                      className={`game-slate-preview-crew-impact-chip ${crewImpactToneClass(scoringTone)}`}
                    >
                      <span className="game-slate-preview-crew-impact-label">
                        {preview.scoringLabel}
                      </span>
                      <span className="game-slate-preview-crew-impact-metric font-tabular tabular-nums">
                        {formatSigned(preview.totalPointsDelta)} impact
                      </span>
                      {scoringTone === "positive" ? (
                        <TrendingUp size={14} aria-hidden className="game-slate-preview-crew-impact-trend" />
                      ) : scoringTone === "negative" ? (
                        <TrendingDown size={14} aria-hidden className="game-slate-preview-crew-impact-trend" />
                      ) : null}
                      <span className="game-slate-preview-crew-impact-meta font-tabular tabular-nums">
                        {preview.avgTotalPoints} avg · {formatPct(preview.overRate)} over
                      </span>
                    </div>
                    <div
                      className={`game-slate-preview-crew-impact-chip ${crewImpactToneClass(whistleTone)}`}
                    >
                      <span className="game-slate-preview-crew-impact-label">
                        {preview.whistleLabel}
                      </span>
                      <span className="game-slate-preview-crew-impact-metric font-tabular tabular-nums">
                        {formatSigned(preview.foulsDelta)} impact
                      </span>
                      {whistleTone === "positive" ? (
                        <TrendingUp size={14} aria-hidden className="game-slate-preview-crew-impact-trend" />
                      ) : whistleTone === "negative" ? (
                        <TrendingDown size={14} aria-hidden className="game-slate-preview-crew-impact-trend" />
                      ) : null}
                      <span className="game-slate-preview-crew-impact-meta font-tabular tabular-nums">
                        {preview.avgFouls} avg
                      </span>
                    </div>
                    {preview.premiumGap !== undefined ? (
                      <div
                        className={`game-slate-preview-crew-impact-chip ${crewImpactToneClass(signedDeltaTone(preview.premiumGap))}`}
                      >
                        <span className="game-slate-preview-crew-impact-label">Vs benchmark</span>
                        <span className="game-slate-preview-crew-impact-metric font-tabular tabular-nums">
                          {formatSigned(preview.premiumGap)}
                        </span>
                        {preview.premiumLabel ? (
                          <span className="game-slate-preview-crew-impact-meta">
                            {preview.premiumLabel}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <p className="game-slate-preview-crew-impact-sample font-tabular tabular-nums">
                    {impactSampleLabel}
                  </p>
                </section>
              )}

              {!awaitingCrew ? (
                <EvidenceDrawer evidence={projectionEvidence} className="game-slate-preview-evidence" />
              ) : null}

              {preview.teamImpacts.length > 0 ? (
                <section
                  className="game-slate-preview-team-impact-grid"
                  aria-label="Team impact by side"
                >
                  {preview.teamImpacts.map((impact) => {
                    const team = resolveSlateTeam(preview.leagueId, impact.teamAbbr);
                    if (!team) return null;
                    return (
                      <TeamImpactCard
                        key={impact.teamAbbr}
                        team={team}
                        sport={sport}
                        teamAbbr={impact.teamAbbr}
                        teamLabel={impact.teamLabel}
                        insights={impact.insights}
                        basePath={preview.basePath}
                      />
                    );
                  })}
                </section>
              ) : null}

              {matchupInsights.length > 0 ? (
                <section
                  className="ref-preview-drawer-section"
                  aria-label={refVsTeamsLabel}
                >
                  <h3 className="ref-preview-drawer-section-title">{refVsTeamsLabel}</h3>
                  <div className="matchup-insight-card-grid gap-4">
                    {matchupInsights.map((insight) => (
                      <MatchupInsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                </section>
              ) : null}

              {preview.refTeamRows.length > 0 ? (
                <section className="ref-preview-drawer-section" aria-label="Ref team splits">
                  <h3 className="ref-preview-drawer-section-title">Ref × team history</h3>
                  <div className="ref-preview-drawer-table-wrap">
                    <table className="ref-preview-drawer-table data-table game-slate-preview-team-table">
                      <thead>
                        <tr>
                          <th scope="col">Official</th>
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
                        {preview.teamImpacts.flatMap((impact) => {
                          const rows = rowsByTeam.get(impact.teamAbbr) ?? [];
                          if (rows.length === 0) return [];
                          const team = resolveSlateTeam(preview.leagueId, impact.teamAbbr);
                          return [
                            <tr
                              key={`header-${impact.teamAbbr}`}
                              className="game-slate-preview-team-table-header"
                            >
                              <th scope="rowgroup" colSpan={4}>
                                <span className="game-slate-preview-team-table-header-inner">
                                  {team ? (
                                    <TeamLogo team={team} sport={sport} size="sm" />
                                  ) : null}
                                  <span>{impact.teamAbbr}</span>
                                  <span className="game-slate-preview-team-table-header-name">
                                    {impact.teamLabel}
                                  </span>
                                </span>
                              </th>
                            </tr>,
                            ...rows.map((row) => (
                              <tr
                                key={`${row.refSlug}-${row.teamAbbr}`}
                                className={[
                                  "game-slate-preview-team-table-row",
                                  row.isOutlier ? "game-slate-preview-row--outlier" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <td>
                                  <Link
                                    href={`${preview.basePath}/refs/${row.refSlug}`}
                                    className="font-medium hover:underline"
                                  >
                                    {row.refName}
                                  </Link>
                                </td>
                                <td className="data-table-num font-tabular tabular-nums">
                                  {row.record}
                                </td>
                                <td className="data-table-num font-tabular tabular-nums">
                                  {formatPct(row.overRate)}
                                </td>
                                <td
                                  className={`data-table-num font-tabular tabular-nums game-slate-preview-fouls-delta ${foulsDeltaClass(row.foulsDelta)}`}
                                >
                                  {formatSigned(row.foulsDelta)}
                                </td>
                              </tr>
                            )),
                          ];
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </div>

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
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}
