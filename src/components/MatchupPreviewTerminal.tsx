"use client";

import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { OverlayNavLink } from "@/components/OverlayNavLink";
import { GameSlateFingerprintPanel } from "@/components/visuals/GameSlateFingerprintPanel";
import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildCrewDnaSynthesis,
  buildMatchupCrewRoster,
  buildMatchupDriverLines,
  buildMatchupMatrixRows,
  buildMatchupTerminalMetrics,
  buildMatchupTrustSignalBar,
  buildMatchupVerdictHeadline,
  buildModelWeightLines,
  buildOfficiatingFingerprintTechnicalLines,
  buildRawFactorLines,
  buildSupplementalContextLines,
  type CrewDnaImpactDirective,
  type MatchupDriverLine,
  type MatchupMatrixCell,
  type MatchupRawFactorLine,
} from "@/lib/matchup-preview-terminal";
import "@/components/matchup-preview-terminal.css";

const TERMINAL_ICON_SIZE = 14;

type MatchupPreviewTerminalProps = {
  preview: GameSlatePreviewPayload;
  evidence: ProjectionEvidencePayload;
};

function DriverDirectionIcon({
  direction,
  className,
}: {
  direction: MatchupDriverLine["direction"];
  className?: string;
}) {
  if (direction === "increase") {
    return (
      <TrendingUp
        aria-hidden
        size={TERMINAL_ICON_SIZE}
        strokeWidth={2.25}
        className={className}
      />
    );
  }
  return (
    <TrendingDown
      aria-hidden
      size={TERMINAL_ICON_SIZE}
      strokeWidth={2.25}
      className={className}
    />
  );
}

function DriverList({
  title,
  drivers,
  emptyLabel,
}: {
  title: string;
  drivers: MatchupDriverLine[];
  emptyLabel: string;
}) {
  return (
    <div className="matchup-terminal-drivers">
      <h4 className="matchup-terminal-drivers__title">{title}</h4>
      {drivers.length === 0 ? (
        <p className="matchup-terminal-drivers__empty">{emptyLabel}</p>
      ) : (
        <ul className="matchup-terminal-drivers__list">
          {drivers.map((driver) => (
            <li
              key={driver.id}
              className={`matchup-terminal-drivers__line matchup-terminal-drivers__line--${driver.tone}`}
            >
              <DriverDirectionIcon
                direction={driver.direction}
                className={`matchup-terminal-drivers__icon matchup-terminal-drivers__icon--${driver.tone}`}
              />
              <span>
                {driver.label}{" "}
                <span className="matchup-terminal-drivers__delta tabular-nums">
                  ({driver.deltaTag} whistles)
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MatrixCell({ cell }: { cell: MatchupMatrixCell }) {
  if (cell.empty) {
    return <span className="matchup-terminal-matrix__empty">--</span>;
  }

  return (
    <span className="matchup-terminal-matrix__cell">
      <span
        className={`matchup-terminal-matrix__delta matchup-terminal-matrix__delta--${cell.foulsTone} tabular-nums`}
      >
        {cell.foulsDeltaLabel}
      </span>{" "}
      <span
        className={`matchup-terminal-matrix__win matchup-terminal-matrix__win--${cell.winRateTone} tabular-nums`}
      >
        ({cell.winRateLabel} Win %)
      </span>
    </span>
  );
}

function ImpactDirectiveIcon({ directive }: { directive: CrewDnaImpactDirective }) {
  if (directive.id === "free_throw_volume") {
    return (
      <TrendingUp
        aria-hidden
        size={TERMINAL_ICON_SIZE}
        strokeWidth={2.25}
        className={`crew-dna-directive__icon crew-dna-directive__icon--${directive.tone}`}
      />
    );
  }
  if (directive.id === "home_advantage") {
    return (
      <ShieldAlert
        aria-hidden
        size={TERMINAL_ICON_SIZE}
        strokeWidth={2.25}
        className={`crew-dna-directive__icon crew-dna-directive__icon--${directive.tone}`}
      />
    );
  }
  return (
    <Zap
      aria-hidden
      size={TERMINAL_ICON_SIZE}
      strokeWidth={2.25}
      className={`crew-dna-directive__icon crew-dna-directive__icon--${directive.tone}`}
    />
  );
}

function TerminalAccordion({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`matchup-terminal-accordion${open ? " matchup-terminal-accordion--open" : ""}`}
    >
      <button
        type="button"
        className="matchup-terminal-accordion__trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDown
          aria-hidden
          size={TERMINAL_ICON_SIZE}
          strokeWidth={2.25}
          className="matchup-terminal-accordion__chevron"
        />
        <span className="matchup-terminal-accordion__trigger-icon">{icon}</span>
        <span>{title}</span>
      </button>
      {open ? <div className="matchup-terminal-accordion__panel">{children}</div> : null}
    </div>
  );
}

function RawFactorLine({ factor }: { factor: MatchupRawFactorLine }) {
  return (
    <li>
      <span className="matchup-terminal-accordion__factor-head">
        <DriverDirectionIcon
          direction={factor.direction}
          className={`matchup-terminal-accordion__factor-icon matchup-terminal-accordion__factor-icon--${factor.direction}`}
        />
        {factor.headline}
      </span>
      <span className="matchup-terminal-accordion__factor-detail">{factor.detail}</span>
    </li>
  );
}

export function MatchupPreviewTerminal({
  preview,
  evidence,
}: MatchupPreviewTerminalProps) {
  const verdict = buildMatchupVerdictHeadline(preview);
  const metrics = buildMatchupTerminalMetrics(preview, evidence);
  const trustBar = buildMatchupTrustSignalBar(preview);
  const drivers = buildMatchupDriverLines(evidence);
  const roster = buildMatchupCrewRoster(preview);
  const matrix = buildMatchupMatrixRows(preview);
  const modelWeights = buildModelWeightLines(evidence.modelContribution);
  const rawFactors = buildRawFactorLines(evidence);
  const supplemental = buildSupplementalContextLines(preview);
  const crewDna = buildCrewDnaSynthesis(preview);
  const fingerprintTechnical = buildOfficiatingFingerprintTechnicalLines(preview);
  const hasFingerprint = (preview.crewFingerprints?.length ?? 0) > 0;
  const metricUnit = preview.whistleLabel.toLowerCase();

  return (
    <div className="matchup-preview-terminal">
      <section className="matchup-terminal-section matchup-terminal-verdict" aria-label="RefWatch verdict">
        <p className="matchup-terminal-verdict__kicker">Overall verdict</p>
        <h3
          className={`matchup-terminal-verdict__headline matchup-terminal-verdict__headline--${verdict.personality}`}
        >
          {verdict.label.toUpperCase()}
        </h3>

        <div className="matchup-terminal-verdict__metrics" aria-label="Key projection metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="matchup-terminal-verdict__metric">
              <span className="matchup-terminal-verdict__metric-label">{metric.label}</span>
              <span className="matchup-terminal-verdict__metric-value tabular-nums">
                {metric.value}
              </span>
              {metric.meta ? (
                <span className="matchup-terminal-verdict__metric-meta tabular-nums">
                  {metric.meta}
                  {metric.delta ? (
                    <>
                      {" "}
                      <span
                        className={`matchup-terminal-verdict__delta matchup-terminal-verdict__delta--${metric.deltaTone ?? "neutral"} tabular-nums`}
                      >
                        {metric.delta}
                      </span>
                    </>
                  ) : null}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <p className="matchup-terminal-verdict__trust">
          <CheckCircle2
            aria-hidden
            size={TERMINAL_ICON_SIZE}
            strokeWidth={2.25}
            className="matchup-terminal-verdict__trust-icon"
          />
          {trustBar}
        </p>
      </section>

      <section
        className="matchup-terminal-section matchup-terminal-drivers-section"
        aria-label="Why the model thinks this"
      >
        <h3 className="matchup-terminal-section__title">Why the model thinks this</h3>
        <div className="matchup-terminal-drivers-grid">
          <DriverList
            title="Top positive factors"
            drivers={drivers.positive}
            emptyLabel="No measured drivers increasing fouls."
          />
          <DriverList
            title="Top negative factors"
            drivers={drivers.negative}
            emptyLabel="No measured drivers reducing fouls."
          />
        </div>
      </section>

      <section className="matchup-terminal-section" aria-label="Assigned crew">
        <div className="matchup-terminal-crew-line">
          <span className="matchup-terminal-crew-line__label">Crew:</span>
          {roster.map((official, index) => (
            <span key={official.slug} className="matchup-terminal-crew-line__member">
              {index > 0 ? (
                <span className="matchup-terminal-crew-line__sep" aria-hidden>
                  ·
                </span>
              ) : null}
              <OverlayNavLink
                href={`${preview.basePath}/refs/${official.slug}`}
                className="matchup-terminal-crew-line__link"
              >
                {official.name}
                {official.deltaLabel ? (
                  <span className="matchup-terminal-crew-line__delta tabular-nums">
                    {" "}
                    ({official.deltaLabel})
                  </span>
                ) : null}
              </OverlayNavLink>
            </span>
          ))}
        </div>
      </section>

      <section
        className="matchup-terminal-section matchup-terminal-matrix-section"
        aria-label="Team matchup matrix"
      >
        <h3 className="matchup-terminal-section__title">Team matchup matrix</h3>
        <div className="matchup-terminal-matrix-wrap">
          <table className="matchup-terminal-matrix">
            <thead>
              <tr>
                <th scope="col">Official</th>
                <th scope="col" className="matchup-terminal-matrix__num">
                  {matrix.awayAbbr} impact (Win %)
                </th>
                <th scope="col" className="matchup-terminal-matrix__num">
                  {matrix.homeAbbr} impact (Win %)
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.refSlug}>
                  <th scope="row">
                    <OverlayNavLink
                      href={`${preview.basePath}/refs/${row.refSlug}`}
                      className="matchup-terminal-matrix__official"
                    >
                      {row.officialLabel}
                    </OverlayNavLink>
                  </th>
                  <td className="matchup-terminal-matrix__num">
                    <MatrixCell cell={row.away} />
                  </td>
                  <td className="matchup-terminal-matrix__num">
                    <MatrixCell cell={row.home} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="matchup-terminal-matrix__legend">
          Fouls/game delta vs crew baseline · Win % · Over rate available in raw breakdown
        </p>
      </section>

      {hasFingerprint ? (
        <section
          className="matchup-terminal-section matchup-terminal-fingerprint-section"
          aria-label="Crew DNA"
        >
          <h3 className="matchup-terminal-section__title">Crew DNA</h3>
          <GameSlateFingerprintPanel
            crewFingerprints={preview.crewFingerprints ?? []}
            basePath={preview.basePath}
            consumerFacing
          />

          <div className="crew-dna-synthesis" aria-label="Crew DNA synthesis">
            <p className="crew-dna-synthesis__label">
              <Sparkles
                aria-hidden
                size={TERMINAL_ICON_SIZE}
                strokeWidth={2.25}
                className="crew-dna-synthesis__label-icon"
              />
              Automated synthesis
            </p>
            <p className="crew-dna-synthesis__line">{crewDna.synthesisLine}</p>
            <ul className="crew-dna-directives" aria-label="Impact directives">
              {crewDna.directives.map((directive) => (
                <li key={directive.id} className="crew-dna-directive">
                  <ImpactDirectiveIcon directive={directive} />
                  <span>
                    <strong>{directive.label}:</strong> {directive.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="matchup-terminal-section matchup-terminal-accordions" aria-label="Deep model details">
        <TerminalAccordion
          title="Model weights & sample data"
          icon={<FileText aria-hidden size={TERMINAL_ICON_SIZE} strokeWidth={2.25} />}
        >
          <ul className="matchup-terminal-accordion__list">
            {modelWeights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="matchup-terminal-accordion__meta tabular-nums">
            Sample: {preview.sampleGames} games · Projected {metricUnit}:{" "}
            {evidence.projection.toFixed(1)} · Scoring impact:{" "}
            {preview.totalPointsDelta >= 0 ? "+" : ""}
            {preview.totalPointsDelta.toFixed(1)} · Over rate:{" "}
            {(preview.overRate * 100).toFixed(1)}%
          </p>
        </TerminalAccordion>

        <TerminalAccordion
          title="Raw factor breakdown"
          icon={<AlertCircle aria-hidden size={TERMINAL_ICON_SIZE} strokeWidth={2.25} />}
        >
          {rawFactors.length === 0 ? (
            <p className="matchup-terminal-accordion__empty">
              Raw factor strings publish when sample gates clear.
            </p>
          ) : (
            <ul className="matchup-terminal-accordion__factor-list">
              {rawFactors.map((factor) => (
                <RawFactorLine key={factor.id} factor={factor} />
              ))}
            </ul>
          )}
          {supplemental.length > 0 ? (
            <ul className="matchup-terminal-accordion__list matchup-terminal-accordion__list--context">
              {supplemental.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </TerminalAccordion>

        {hasFingerprint ? (
          <TerminalAccordion
            title="Officiating fingerprint"
            icon={<FileText aria-hidden size={TERMINAL_ICON_SIZE} strokeWidth={2.25} />}
          >
            {fingerprintTechnical.length === 0 ? (
              <p className="matchup-terminal-accordion__empty">
                Technical fingerprint axes publish when crew sample gates clear.
              </p>
            ) : (
              <ul className="matchup-terminal-accordion__list">
                {fingerprintTechnical.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </TerminalAccordion>
        ) : null}
      </section>
    </div>
  );
}
