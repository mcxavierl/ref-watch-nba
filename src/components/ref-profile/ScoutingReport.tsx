import { ClinicalCard } from "@/components/hub/ClinicalCard";
import { ArchetypeCard } from "@/components/ref-profile/ArchetypeCard";
import { PressureGauge } from "@/components/ref-profile/PressureGauge";
import {
  generateScoutingReport,
  type GameScoutingMetadata,
} from "@/lib/analytics/generate-scouting-report";
import type { ResolvedOfficialProfile } from "@/lib/analytics/resolve-official-profile";
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

export function ScoutingReport({
  leagueId,
  profile,
  stats,
  qualified,
  gameMetadata,
}: ScoutingReportProps) {
  const resolved: ResolvedOfficialProfile = { profile, stats, qualified };
  const report = generateScoutingReport(
    profile.slug,
    {
      leagueId,
      isPlayoff: gameMetadata?.isPlayoff,
      isPrimetime: gameMetadata?.isPrimetime,
      seasonStage: gameMetadata?.seasonStage,
    },
    resolved,
  );

  if (!report) return null;

  const { styleProfile } = report;

  return (
    <>
      <ArchetypeCard
        displayName={report.archetypeDisplayName}
        blurb={report.archetypeBlurb}
        consistencyScore={report.consistencyScore}
        officialStats={report.officialStats}
      />

      <PressureGauge
        state={report.pressureGauge}
        leverageIndex={report.leverageIndex}
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
        <p className="scouting-style-profile-label">
          Style meter: {styleProfile.gameFlowScore}% subjective,{" "}
          {styleProfile.strictnessScore}% procedural
        </p>
      </div>

      <div className="scouting-report-metrics">
        <div className="scouting-report-metric">
          <span className="scouting-report-metric-label">Sample window</span>
          <span className="scouting-report-metric-value">
            {report.sampleGames} games
          </span>
        </div>
        <div className="scouting-report-metric">
          <span className="scouting-report-metric-label">Baseline whistle rate</span>
          <span className="scouting-report-metric-value">
            {report.baselineWhistlesPerGame}/game
          </span>
        </div>
        <div className="scouting-report-metric">
          <span className="scouting-report-metric-label">Subjective share</span>
          <span className="scouting-report-metric-value">
            {(styleProfile.subjectiveShare * 100).toFixed(1)}%
          </span>
        </div>
        <div className="scouting-report-metric">
          <span className="scouting-report-metric-label">High-stakes rate</span>
          <span className="scouting-report-metric-value">
            {report.pressureWhistlesPerGame !== null
              ? `${report.pressureWhistlesPerGame}/game`
              : "n/a"}
          </span>
        </div>
      </div>

      <ul className="scouting-report-insights">
        {report.insights.map((insight) => (
          <li key={insight}>{insight}</li>
        ))}
      </ul>

      <p className="scouting-report-footnote">
        Predictive profile from the last {report.sampleWindow} officiated games using{" "}
        {report.eventBackedGames > 0 ? "event-tagged" : "taxonomy-weighted"} foul
        classification. {!qualified ? "Sample gate not met for full profile metrics." : ""}
      </p>
    </ClinicalCard>
    </>
  );
}
