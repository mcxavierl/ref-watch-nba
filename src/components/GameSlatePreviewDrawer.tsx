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
import { GameSlateFingerprintPanel } from "@/components/visuals/GameSlateFingerprintPanel";
import { EvidenceDrawer } from "@/components/evidence/EvidenceDrawer";
import { ExportOnAirGraphicTrigger } from "@/components/media/MediaCardModal";
import { ModalPortal } from "@/components/ModalPortal";
import { OfficialRoleBadge } from "@/components/OfficialRoleBadge";
import { OuLeanBadge } from "@/components/OuLeanBadge";
import { RefAvatar } from "@/components/RefAvatar";
import { TeamImpactCard } from "@/components/TeamImpactCard";
import { TeamLogo } from "@/components/TeamLogo";
import { STATE_COLOR_CLASS } from "@/constants/colors";
import { safeBuildProjectionEvidence } from "@/lib/safe-build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildGameSlateMatchupInsights,
  refVsTeamsSectionLabel,
} from "@/lib/game-slate-matchup-insights";
import type { RefRole } from "@/lib/types";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { signedDeltaTone } from "@/lib/metric-delight";
import { IntelligenceCard } from "@/components/intelligence/IntelligenceCard";
import { GameSlatePreviewErrorBoundary } from "@/components/GameSlatePreviewErrorBoundary";
import { resolveSlateTeam, slateTeamLogoSport } from "@/lib/slate-team-display";
import { normalizeGameSlatePreview } from "@/lib/normalize-game-slate-preview";

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
  const evidenceSectionRef = useRef<HTMLElement>(null);
  const [drawerVisualTab, setDrawerVisualTab] = useState<"impact" | "fingerprint">(
    "impact",
  );
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

  const scrollToEvidence = useCallback(() => {
    evidenceSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!rendered) return null;

  const safePreview = normalizeGameSlatePreview(preview);
  if (!safePreview) return null;

  const awayTeam = safePreview.awayAbbr
    ? resolveSlateTeam(safePreview.leagueId, safePreview.awayAbbr)
    : null;
  const homeTeam = safePreview.homeAbbr
    ? resolveSlateTeam(safePreview.leagueId, safePreview.homeAbbr)
    : null;
  const sport = slateTeamLogoSport(safePreview.leagueId);
  const scoringTone = signedDeltaTone(safePreview.totalPointsDelta);
  const whistleTone = signedDeltaTone(safePreview.foulsDelta);
  const rowsByTeam = new Map(
    safePreview.teamImpacts.map((impact) => [
      impact.teamAbbr,
      safePreview.refTeamRows.filter((row) => row.teamAbbr === impact.teamAbbr),
    ]),
  );
  const matchupInsights = buildGameSlateMatchupInsights(safePreview.refTeamRows);
  const refVsTeamsLabel = refVsTeamsSectionLabel(safePreview.crew.length);
  const projectionEvidence = safeBuildProjectionEvidence(safePreview);
  const awaitingCrew = safePreview.awaitingCrew ?? safePreview.crew.length === 0;
  const briefing = safePreview.matchupBriefing;
  const drawerKicker = awaitingCrew
    ? `${safePreview.leagueLabel} · Matchup sheet`
    : `${safePreview.leagueLabel} · Game preview`;
  const impactSectionTitle = awaitingCrew ? "Head-to-head profile" : "Crew impact";
  const impactSampleLabel = awaitingCrew
    ? `${safePreview.sampleGames} head-to-head meetings`
    : `${safePreview.sampleGames} games in sample`;
  const insufficientCopy = awaitingCrew
    ? "Limited head-to-head history for this pairing. Context below uses recent team form and slate notes."
    : "Not enough qualified crew history to show composite tendencies yet.";
  const intelligenceCard = safePreview.intelligenceCard ?? null;
  const hasFingerprint =
    !awaitingCrew && (safePreview.crewFingerprints?.length ?? 0) > 0;
  const showImpactPanel = !hasFingerprint || drawerVisualTab === "impact";

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
          data-league={safePreview.leagueId}
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
                    {safePreview.matchup}
                  </h2>
                </div>
                <OuLeanBadge lean={safePreview.ouLean} />
              </div>
            </div>
            <div className="ref-preview-drawer-header-actions">
              {safePreview.broadcastExport ? (
                <ExportOnAirGraphicTrigger
                  broadcastExport={safePreview.broadcastExport}
                  className="game-slate-preview-broadcast-kit"
                />
              ) : null}
              <button
                ref={closeButtonRef}
                type="button"
                className="ref-preview-drawer-close"
                onClick={onClose}
                aria-label="Close game preview"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          </header>

          <GameSlatePreviewErrorBoundary onReset={onClose}>
            <div className="ref-preview-drawer-body">
            {intelligenceCard ? (
              <IntelligenceCard
                content={intelligenceCard}
                onViewEvidence={scrollToEvidence}
              />
            ) : null}

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
                {briefing?.lines?.length ? (
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
                  {safePreview.crew.map((official) => (
                    <Link
                      key={official.slug}
                      href={`${safePreview.basePath}/refs/${official.slug}`}
                      className="crew-chip"
                    >
                      <RefAvatar
                        name={official.name}
                        slug={official.slug}
                        sport={safePreview.sport}
                        size="sm"
                        className="h-6 w-6 text-[9px]"
                      />
                      {official.name}
                      {safePreview.sport === "nhl" && official.role ? (
                        <OfficialRoleBadge role={official.role as RefRole} />
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="flex flex-col gap-6">
              {hasFingerprint ? (
                <div
                  className="game-slate-preview-visual-tabs"
                  role="tablist"
                  aria-label="Game preview visuals"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={drawerVisualTab === "impact"}
                    className={`officiating-fingerprint-tab${
                      drawerVisualTab === "impact"
                        ? " officiating-fingerprint-tab--active"
                        : ""
                    }`}
                    onClick={() => setDrawerVisualTab("impact")}
                  >
                    Crew impact
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={drawerVisualTab === "fingerprint"}
                    className={`officiating-fingerprint-tab${
                      drawerVisualTab === "fingerprint"
                        ? " officiating-fingerprint-tab--active"
                        : ""
                    }`}
                    onClick={() => setDrawerVisualTab("fingerprint")}
                  >
                    Officiating fingerprint
                  </button>
                </div>
              ) : null}

              {hasFingerprint && drawerVisualTab === "fingerprint" ? (
                <GameSlateFingerprintPanel
                  crewFingerprints={safePreview.crewFingerprints ?? []}
                />
              ) : null}

              {showImpactPanel && safePreview.insufficientSample ? (
                <p className="ref-preview-drawer-summary-copy">{insufficientCopy}</p>
              ) : showImpactPanel ? (
                <section className="game-slate-preview-crew-impact" aria-label={impactSectionTitle}>
                  <h3 className="ref-preview-drawer-section-title">{impactSectionTitle}</h3>
                  <div className="game-slate-preview-crew-impact-chips">
                    <div
                      className={`game-slate-preview-crew-impact-chip ${crewImpactToneClass(scoringTone)}`}
                    >
                      <span className="game-slate-preview-crew-impact-label">
                        {safePreview.scoringLabel}
                      </span>
                      <span className="game-slate-preview-crew-impact-metric font-tabular tabular-nums">
                        {formatSigned(safePreview.totalPointsDelta)} impact
                      </span>
                      {scoringTone === "positive" ? (
                        <TrendingUp size={14} aria-hidden className="game-slate-preview-crew-impact-trend" />
                      ) : scoringTone === "negative" ? (
                        <TrendingDown size={14} aria-hidden className="game-slate-preview-crew-impact-trend" />
                      ) : null}
                      <span className="game-slate-preview-crew-impact-meta font-tabular tabular-nums">
                        {safePreview.avgTotalPoints} avg · {formatPct(safePreview.overRate)} over
                      </span>
                    </div>
                    <div
                      className={`game-slate-preview-crew-impact-chip ${crewImpactToneClass(whistleTone)}`}
                    >
                      <span className="game-slate-preview-crew-impact-label">
                        {safePreview.whistleLabel}
                      </span>
                      <span className="game-slate-preview-crew-impact-metric font-tabular tabular-nums">
                        {formatSigned(safePreview.foulsDelta)} impact
                      </span>
                      {whistleTone === "positive" ? (
                        <TrendingUp size={14} aria-hidden className="game-slate-preview-crew-impact-trend" />
                      ) : whistleTone === "negative" ? (
                        <TrendingDown size={14} aria-hidden className="game-slate-preview-crew-impact-trend" />
                      ) : null}
                      <span className="game-slate-preview-crew-impact-meta font-tabular tabular-nums">
                        {safePreview.avgFouls} avg
                      </span>
                    </div>
                    {safePreview.premiumGap !== undefined ? (
                      <div
                        className={`game-slate-preview-crew-impact-chip ${crewImpactToneClass(signedDeltaTone(safePreview.premiumGap))}`}
                      >
                        <span className="game-slate-preview-crew-impact-label">Vs benchmark</span>
                        <span className="game-slate-preview-crew-impact-metric font-tabular tabular-nums">
                          {formatSigned(safePreview.premiumGap)}
                        </span>
                        {safePreview.premiumLabel ? (
                          <span className="game-slate-preview-crew-impact-meta">
                            {safePreview.premiumLabel}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <p className="game-slate-preview-crew-impact-sample font-tabular tabular-nums">
                    {impactSampleLabel}
                  </p>
                </section>
              ) : null}

              {!awaitingCrew && projectionEvidence ? (
                <section ref={evidenceSectionRef}>
                  <EvidenceDrawer
                    evidence={projectionEvidence}
                    className="game-slate-preview-evidence"
                  />
                </section>
              ) : null}

              {safePreview.teamImpacts.length > 0 ? (
                <section
                  className="game-slate-preview-team-impact-grid"
                  aria-label="Team impact by side"
                >
                  {safePreview.teamImpacts.map((impact) => {
                    const team = resolveSlateTeam(safePreview.leagueId, impact.teamAbbr);
                    if (!team) return null;
                    return (
                      <TeamImpactCard
                        key={impact.teamAbbr}
                        team={team}
                        sport={sport}
                        teamAbbr={impact.teamAbbr}
                        teamLabel={impact.teamLabel}
                        insights={impact.insights}
                        basePath={safePreview.basePath}
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

              {safePreview.refTeamRows.length > 0 ? (
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
                        {safePreview.teamImpacts.flatMap((impact) => {
                          const rows = rowsByTeam.get(impact.teamAbbr) ?? [];
                          if (rows.length === 0) return [];
                          const team = resolveSlateTeam(safePreview.leagueId, impact.teamAbbr);
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
                                    href={`${safePreview.basePath}/refs/${row.refSlug}`}
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

            {safePreview.homeBiasHeadline ? (
              <section className="ref-preview-drawer-summary" aria-label="Home bias">
                <h3 className="ref-preview-drawer-section-title">Home bias</h3>
                <p className="ref-preview-drawer-summary-copy">{safePreview.homeBiasHeadline}</p>
              </section>
            ) : null}

            {safePreview.storylines.length > 0 ? (
              <section className="ref-preview-drawer-section" aria-label="Ref history flags">
                <h3 className="ref-preview-drawer-section-title">Outlier flags</h3>
                <ul className="game-slate-preview-storylines">
                  {safePreview.storylines.map((story) => (
                    <li key={story.headline}>
                      <strong>{story.headline}</strong>
                      <p>{story.summary}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
          </GameSlatePreviewErrorBoundary>
        </aside>
      </div>
    </ModalPortal>
  );
}
