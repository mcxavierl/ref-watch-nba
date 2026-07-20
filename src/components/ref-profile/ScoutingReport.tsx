import { ClinicalCard } from "@/components/hub/ClinicalCard";
import { ArchetypeCard } from "@/components/ref-profile/ArchetypeCard";
import { HandicappersInsight } from "@/components/ref-profile/HandicappersInsight";
import { PressureGauge } from "@/components/ref-profile/PressureGauge";
import { ScoutingWhistleTooltipLabel } from "@/components/ref-profile/ScoutingWhistleTooltipLabel";
import {
  generateScoutingReport,
  type GameScoutingMetadata,
} from "@/lib/analytics/generate-scouting-report";
import type { ResolvedOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import type { ScoutingReport as ScoutingReportData } from "@/lib/analytics/scouting-report-types";
import {
  PROCEDURAL_WHISTLE_TOOLTIP,
  SCOUTING_METRIC_DISPLAY_MIN_GAMES,
  SUBJECTIVE_WHISTLE_TOOLTIP,
} from "@/lib/analytics/scouting-report-types";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";
import "./scouting-report.css";

type ScoutingReportProps = {
  leagueId: LeagueId;
  profile: RefProfile;
  stats: RefStatsFile;
  qualified: boolean;
  gameMetadata?: Partial<Omit<GameScoutingMetadata, "leagueId">>;
};

function strictnessPosition(strictnessScore: number): string {
  return `${Math.max(4, Math.min(96, strictnessScore))}%`;
}

function formatHighStakesRate(
  sampleGames: number,
  pressureWhistlesPerGame: number | null,
): { label: string; insufficient: boolean } {
  if (
    sampleGames < SCOUTING_METRIC_DISPLAY_MIN_GAMES ||
    pressureWhistlesPerGame === null
  ) {
    return { label: "Insufficient Data", insufficient: true };
  }
  return { label: `${pressureWhistlesPerGame}/game`, insufficient: false };
}

function resolveReport({
  leagueId,
  profile,
  stats,
  qualified,
  gameMetadata,
}: ScoutingReportProps): ScoutingReportData | null {
  const resolved: ResolvedOfficialProfile = { profile, stats, qualified };
  return generateScoutingReport(
    profile.slug,
    {
      leagueId,
      isPlayoff: gameMetadata?.isPlayoff,
      isPrimetime: gameMetadata?.isPrimetime,
      seasonStage: gameMetadata?.seasonStage,
    },
    resolved,
  );
}

/** Edge-first block: archetype + handicapper summary for mobile priority. */
export function ScoutingReportEdge(props: ScoutingReportProps) {
  const report = resolveReport(props);
  if (!report) return null;

  return (
    <div className="ref-profile-edge-stack">
      <ArchetypeCard
        displayName={report.archetypeDisplayName}
        blurb={report.archetypeBlurb}
        consistencyScore={report.consistencyScore}
        officialStats={report.officialStats}
      />
      <HandicappersInsight report={report} />
    </div>
  );
}

/** Secondary scouting depth: leverage gauge and detailed style breakdown. */
export function ScoutingReportDepth(props: ScoutingReportProps) {
  const report = resolveReport(props);
  if (!report) return null;

  const { styleProfile } = report;
  const highStakesRate = formatHighStakesRate(
    report.sampleGames,
    report.pressureWhistlesPerGame,
  );

  return (
    <>
      <PressureGauge
        state={report.pressureGauge}
        leverageIndex={report.leverageSensitivityIndex}
        insight={report.leverageInsight}
      />

      <ClinicalCard
        as="section"
        className="scouting-report-card ref-profile-section"
        aria-labelledby="ref-scouting-report-title"
      >
        <div className="scouting-report-head">
          <div>
            <p className="scouting-report-kicker">Key Insights</p>
            <h2 id="ref-scouting-report-title" className="scouting-report-title">
              Ref-Scouting Report
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="scouting-report-badge">{styleProfile.label}</span>
            {report.pressureSensitive ? (
              <span className="scouting-report-badge scouting-report-badge--pressure">
                Pressure-sensitive
              </span>
            ) : null}
          </div>
        </div>

        <p className="scouting-report-summary">{report.summary}</p>

        <div className="scouting-report-subsection">
          <h3 className="scouting-report-subsection-title">Officiating Style</h3>
          <div className="scouting-style-meter" aria-hidden>
            <div className="scouting-style-meter-labels">
              <span>Loose / Game-Flow</span>
              <span>Strict / Rule-Enforcer</span>
            </div>
            <div className="scouting-style-meter-track">
              <div className="scouting-style-meter-fill" style={{ width: "100%" }} />
              <span
                className="scouting-style-meter-thumb"
                style={{ left: strictnessPosition(styleProfile.strictnessScore) }}
              />
            </div>
            <p className="scouting-style-profile-label tabular-nums">
              {styleProfile.gameFlowScore}%{" "}
              <ScoutingWhistleTooltipLabel hint={SUBJECTIVE_WHISTLE_TOOLTIP}>
                Subjective
              </ScoutingWhistleTooltipLabel>
              , {styleProfile.strictnessScore}%{" "}
              <ScoutingWhistleTooltipLabel hint={PROCEDURAL_WHISTLE_TOOLTIP}>
                Procedural
              </ScoutingWhistleTooltipLabel>
            </p>
          </div>
        </div>

        <div className="scouting-report-metrics">
          <div className="scouting-report-metric">
            <span className="scouting-report-metric-label">Sample window</span>
            <span className="scouting-report-metric-value tabular-nums">
              {report.sampleGames} games
            </span>
          </div>
          <div className="scouting-report-metric">
            <span className="scouting-report-metric-label">Baseline whistle rate</span>
            <span className="scouting-report-metric-value tabular-nums">
              {report.baselineWhistlesPerGame}/game
            </span>
          </div>
          <div className="scouting-report-metric">
            <span className="scouting-report-metric-label">
              <ScoutingWhistleTooltipLabel hint={SUBJECTIVE_WHISTLE_TOOLTIP}>
                Subjective share
              </ScoutingWhistleTooltipLabel>
            </span>
            <span className="scouting-report-metric-value tabular-nums">
              {(styleProfile.subjectiveShare * 100).toFixed(1)}%
            </span>
          </div>
          <div className="scouting-report-metric">
            <span className="scouting-report-metric-label">High-stakes rate</span>
            <span
              className={`scouting-report-metric-value tabular-nums${highStakesRate.insufficient ? " scouting-report-metric-value--insufficient" : ""}`}
            >
              {highStakesRate.label}
            </span>
          </div>
        </div>

        <div className="scouting-report-subsection">
          <h3 className="scouting-report-subsection-title">Game-Flow Impact</h3>
          <p className="scouting-report-narrative">{report.gameFlowImpact}</p>
        </div>

        <p className="scouting-report-footnote">
          Predictive profile from the last {report.sampleWindow} officiated games using{" "}
          {report.eventBackedGames > 0 ? "event-tagged" : "taxonomy-weighted"} officiating
          style data. {!props.qualified ? "Sample gate not met for full profile metrics." : ""}
        </p>
      </ClinicalCard>
    </>
  );
}

export function ScoutingReport(props: ScoutingReportProps) {
  return (
    <>
      <ScoutingReportEdge {...props} />
      <ScoutingReportDepth {...props} />
    </>
  );
}
