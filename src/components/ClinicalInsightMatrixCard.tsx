import Link from "next/link";
import { RefAvatar } from "@/components/RefAvatar";
import { PersonnelAvatar } from "@/components/PersonnelAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { SampleConfidencePill } from "@/components/hub/SampleConfidencePill";
import {
  REF_CARD_METRIC_CLASS,
  RefCard,
} from "@/components/hub/RefCard";
import { formatDeltaPp } from "@/lib/data-maturity";
import type { FrictionGrudgeFinding } from "@/lib/friction-grudge-matrix";
import type { LeagueId } from "@/lib/leagues";
import { statValueDelightTone, type MetricDelightTone } from "@/lib/metric-delight";
import type { MatrixExtremeHighlight } from "@/lib/ref-team-matrix";
import { resolveRefProfileTeam, refProfileTeamLogoSport } from "@/lib/ref-profile-team-utils";
import { formatBaselinePct, formatSigned } from "@/lib/stats-utils";

type MatrixAvatarSport = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
type FrictionSport = "nba" | "nhl" | "nfl";

export type ClinicalInsightMatrixSubject =
  | { kind: "personnel"; name: string; sport: FrictionSport }
  | { kind: "team"; abbr: string; label: string; sport: MatrixAvatarSport };

export type ClinicalInsightMatrixCardModel = {
  refSlug: string;
  refName: string;
  subjectLabel: string;
  subject: ClinicalInsightMatrixSubject;
  /** W-L verification line shown above the KPI (matrix splits only). */
  recordLine?: string;
  deltaDisplay: string;
  baselineLine: string;
  games: number;
  insightKind: string;
  tone: MetricDelightTone;
  /** Short category label shown above the subject line. */
  categoryLabel?: string;
};

function matrixAvatarSport(leagueId: LeagueId): MatrixAvatarSport | null {
  if (
    leagueId === "nba" ||
    leagueId === "nhl" ||
    leagueId === "nfl" ||
    leagueId === "epl" ||
    leagueId === "laliga" ||
    leagueId === "cbb" ||
    leagueId === "cfb"
  ) {
    return leagueId;
  }
  return null;
}

function frictionSport(leagueId: LeagueId): FrictionSport | null {
  if (leagueId === "nba" || leagueId === "nhl" || leagueId === "nfl") return leagueId;
  return null;
}

function metricUnitShort(
  finding: FrictionGrudgeFinding,
  leagueId: LeagueId,
): string {
  if (finding.personnelType === "coach") {
    if (leagueId === "nba") return "tech fouls/game";
    if (leagueId === "nhl") return "minors/game";
    if (leagueId === "nfl") return "flags/game";
    return "calls/game";
  }
  if (leagueId === "nba") return "fouls/game";
  if (leagueId === "nhl") return "minors/game";
  if (leagueId === "nfl") return "flags/game";
  return "calls/game";
}

function frictionBaselineLine(
  finding: FrictionGrudgeFinding,
  games: number,
): string {
  const baseline = finding.baselineValue;
  const sharedGames = `${games} shared game${games === 1 ? "" : "s"}`;
  if (finding.personnelType === "coach") {
    return `vs ${baseline} ref baseline · ${sharedGames}`;
  }
  return `vs ${baseline} season baseline · ${sharedGames}`;
}

function frictionCategoryLabel(finding: FrictionGrudgeFinding): string {
  return finding.pillLabel;
}

function frictionSubjectLabel(finding: FrictionGrudgeFinding): string {
  const role = finding.personnelType === "coach" ? "Coach" : "Star player";
  return `${role}: ${finding.subjectName} (${finding.teamAbbr})`;
}

function frictionDeltaTone(
  finding: FrictionGrudgeFinding,
  delta: number,
): MetricDelightTone {
  if (finding.personnelType === "player") {
    if (finding.playerPattern === "protection") {
      return delta <= 0 ? "positive" : "negative";
    }
    if (finding.playerPattern === "tightness") {
      return delta >= 0 ? "negative" : "positive";
    }
  }
  return statValueDelightTone(formatSigned(delta));
}

export function frictionFindingToMatrixCard(
  finding: FrictionGrudgeFinding,
  leagueId: LeagueId,
): ClinicalInsightMatrixCardModel | null {
  const sport = frictionSport(leagueId);
  if (!sport) return null;

  const metric = Number.parseFloat(finding.metricValue);
  const baseline = Number.parseFloat(finding.baselineValue);
  const delta =
    Number.isFinite(metric) && Number.isFinite(baseline) ? metric - baseline : 0;
  const unit = metricUnitShort(finding, leagueId);

  return {
    refSlug: finding.refSlug,
    refName: finding.refName,
    subjectLabel: frictionSubjectLabel(finding),
    subject: { kind: "personnel", name: finding.subjectName, sport },
    deltaDisplay: `${formatSigned(delta)} ${unit}`,
    baselineLine: frictionBaselineLine(finding, finding.games),
    games: finding.games,
    insightKind: "friction-matrix",
    tone: frictionDeltaTone(finding, delta),
    categoryLabel: frictionCategoryLabel(finding),
  };
}

export function matrixExtremeToMatrixCard(
  item: MatrixExtremeHighlight,
  leagueId: LeagueId,
): ClinicalInsightMatrixCardModel | null {
  const sport = matrixAvatarSport(leagueId);
  if (!sport) return null;

  return {
    refSlug: item.refSlug,
    refName: item.refName,
    subjectLabel: `vs ${item.teamLabel} (${item.teamAbbr})`,
    subject: {
      kind: "team",
      abbr: item.teamAbbr,
      label: item.teamLabel,
      sport,
    },
    recordLine: `Record: ${item.wins}-${item.losses}`,
    deltaDisplay: `${formatDeltaPp(item.deltaPts)} win rate`,
    baselineLine: `vs ${formatBaselinePct(item.baselineGames, item.baselineWinRate)} team baseline`,
    games: item.games,
    insightKind: `matrix-extreme-${item.kind}`,
    tone: item.kind === "high" ? "positive" : "negative",
  };
}

function MatrixSubjectAvatar({
  subject,
  leagueId,
}: {
  subject: ClinicalInsightMatrixSubject;
  leagueId: LeagueId;
}) {
  if (subject.kind === "personnel") {
    return <PersonnelAvatar name={subject.name} sport={subject.sport} size="lg" />;
  }

  const team = resolveRefProfileTeam(leagueId, subject.abbr);
  const logoSport = refProfileTeamLogoSport(leagueId);

  return (
    <TeamLogo
      team={team}
      sport={logoSport}
      size="xl"
      className="clinical-insight-matrix-team-logo"
    />
  );
}

export function ClinicalInsightMatrixCard({
  model,
  leagueId,
  basePath = "",
}: {
  model: ClinicalInsightMatrixCardModel;
  leagueId: LeagueId;
  basePath?: string;
}) {
  const refSport = matrixAvatarSport(leagueId);

  return (
    <RefCard
      data-league={leagueId}
      data-insight={model.insightKind}
      data-tone={model.tone}
      className="clinical-insight-matrix-card"
    >
      <div className="clinical-insight-matrix-header">
        <Link
          href={`${basePath}/refs/${model.refSlug}`}
          className="clinical-insight-matrix-ref-name rankings-insight-name"
        >
          {model.refName}
        </Link>
        <SampleConfidencePill games={model.games} />
      </div>

      {model.categoryLabel ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {model.categoryLabel}
        </p>
      ) : null}

      <div className="clinical-insight-matrix-avatars" aria-hidden>
        {refSport ? (
          <>
            <RefAvatar
              name={model.refName}
              slug={model.refSlug}
              sport={refSport}
              size="lg"
              decorative
            />
            <span className="clinical-insight-matrix-vs">vs</span>
            <MatrixSubjectAvatar subject={model.subject} leagueId={leagueId} />
          </>
        ) : null}
      </div>

      <p className="clinical-insight-matrix-subject text-sm text-slate-300">
        {model.subjectLabel}
      </p>

      {model.recordLine ? (
        <p className="clinical-insight-matrix-record text-sm font-semibold text-slate-200 tabular-nums">
          {model.recordLine}
        </p>
      ) : null}

      <div className="clinical-insight-matrix-metric" aria-label="Delta vs baseline">
        <div className={REF_CARD_METRIC_CLASS}>
          <StandoutMetricValue
            tone={model.tone}
            size="lg"
            className="clinical-insight-matrix-kpi text-3xl tabular-nums"
          >
            {model.deltaDisplay}
          </StandoutMetricValue>
        </div>
        <p className="clinical-insight-matrix-baseline text-sm text-slate-400 tabular-nums">
          {model.baselineLine}
        </p>
      </div>
    </RefCard>
  );
}

export function FrictionInsightMatrixCard({
  finding,
  leagueId,
  basePath = "",
}: {
  finding: FrictionGrudgeFinding;
  leagueId: LeagueId;
  basePath?: string;
}) {
  const model = frictionFindingToMatrixCard(finding, leagueId);
  if (!model) return null;

  return (
    <ClinicalInsightMatrixCard model={model} leagueId={leagueId} basePath={basePath} />
  );
}
