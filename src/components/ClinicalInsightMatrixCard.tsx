import Link from "next/link";
import { RefAvatar } from "@/components/RefAvatar";
import { PersonnelAvatar } from "@/components/PersonnelAvatar";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import {
  REF_CARD_METRIC_CLASS,
  REF_CARD_METRIC_DETAIL_CLASS,
  RefCard,
} from "@/components/hub/RefCard";
import type { FrictionGrudgeFinding } from "@/lib/friction-grudge-matrix";
import type { LeagueId } from "@/lib/leagues";
import { statValueDelightTone } from "@/lib/metric-delight";
import { formatSigned } from "@/lib/stats-utils";

type FrictionSport = "nba" | "nhl" | "nfl";

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

function baselineContextLine(finding: FrictionGrudgeFinding): string {
  const baseline = finding.baselineValue;
  if (finding.personnelType === "coach") {
    return `vs ${baseline} ref baseline`;
  }
  return `vs ${baseline} season baseline`;
}

function deltaTone(finding: FrictionGrudgeFinding, delta: number) {
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

export function ClinicalInsightMatrixCard({
  finding,
  leagueId,
  basePath = "",
}: {
  finding: FrictionGrudgeFinding;
  leagueId: LeagueId;
  basePath?: string;
}) {
  const sport = frictionSport(leagueId);
  const metric = Number.parseFloat(finding.metricValue);
  const baseline = Number.parseFloat(finding.baselineValue);
  const delta = Number.isFinite(metric) && Number.isFinite(baseline) ? metric - baseline : 0;
  const unit = metricUnitShort(finding, leagueId);
  const deltaDisplay = `${formatSigned(delta)} ${unit}`;
  const tone = deltaTone(finding, delta);

  const subjectLabel =
    finding.personnelType === "coach"
      ? `vs ${finding.subjectName} (${finding.teamAbbr})`
      : `vs ${finding.subjectName} (${finding.teamAbbr})`;

  return (
    <RefCard
      data-league={leagueId}
      data-insight="friction-matrix"
      className="clinical-insight-matrix-card"
    >
      <Link
        href={`${basePath}/refs/${finding.refSlug}`}
        className="clinical-insight-matrix-ref-name rankings-insight-name"
      >
        {finding.refName}
      </Link>

      <div className="clinical-insight-matrix-avatars" aria-hidden>
        {sport ? (
          <>
            <RefAvatar
              name={finding.refName}
              slug={finding.refSlug}
              sport={sport}
              size="lg"
              decorative
            />
            <span className="clinical-insight-matrix-vs">vs</span>
            <PersonnelAvatar name={finding.subjectName} sport={sport} size="lg" />
          </>
        ) : null}
      </div>

      <p className="clinical-insight-matrix-subject">{subjectLabel}</p>

      <div className="clinical-insight-matrix-metric" aria-label="Delta vs baseline">
        <div className={REF_CARD_METRIC_CLASS}>
          <StandoutMetricValue tone={tone} size="hero" className="tabular-nums">
            {deltaDisplay}
          </StandoutMetricValue>
        </div>
        <p className={`${REF_CARD_METRIC_DETAIL_CLASS} clinical-insight-matrix-baseline`}>
          {baselineContextLine(finding)}
        </p>
      </div>

      <p className="clinical-insight-matrix-provenance">
        *Based on {finding.games} shared games. Data adjusted for volatility.*
      </p>
    </RefCard>
  );
}
