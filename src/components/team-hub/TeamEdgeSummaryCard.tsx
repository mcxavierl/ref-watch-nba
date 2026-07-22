import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { ClinicalCard } from "@/components/hub/ClinicalCard";
import { ClinicalMetricCard } from "@/components/hub/ClinicalMetricCard";
import {
  REF_CARD_BODY_CLASS,
  REF_CARD_KICKER_CLASS,
  REF_CARD_METRIC_DETAIL_CLASS,
} from "@/components/hub/RefCard";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { signedDeltaTone } from "@/lib/metric-delight";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { TeamEdgeSummary } from "@/lib/team-insight-hub";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */
export function TeamEdgeSummaryCard({
  summary,
  teamLabel,
  basePath = "",
}: {
  summary: TeamEdgeSummary;
  teamLabel: string;
  basePath?: string;
}) {
  const { topFinding, reliabilityScore, reliabilityLabel, bestRef, worstRef } =
    summary;

  return (
    <ClinicalCard
      as="section"
      className="team-hub-edge-card data-card"
      aria-label="Team edge summary"
    >
      <div className="team-hub-edge-card-grid px-4 py-5 sm:px-5">
        <div className="team-hub-edge-primary">
          <p className={REF_CARD_KICKER_CLASS}>Top finding</p>
          {topFinding ? (
            <>
              <h2 className="team-hub-edge-headline">{topFinding.headline}</h2>
              <p className={`${REF_CARD_BODY_CLASS} team-hub-edge-body`}>
                {topFinding.body}
              </p>
              {topFinding.refSlug && topFinding.refName && (
                <Link
                  href={`${basePath}/refs/${topFinding.refSlug}`}
                  className="team-hub-edge-link"
                >
                  {topFinding.refName} profile →
                </Link>
              )}
            </>
          ) : (
            <p className={`${REF_CARD_BODY_CLASS} team-hub-edge-body`}>
              No statistically significant ref patterns for {teamLabel} in the
              current sample.
            </p>
          )}
        </div>

        <div className="team-hub-edge-metrics">
          <ClinicalMetricCard
            label="Referee reliability"
            value={<span className="tabular-nums">{reliabilityScore}%</span>}
            detail={reliabilityLabel}
            detailMuted
          />

          {bestRef && (
            <div className="team-hub-ref-badge">
              <StatusBadge verdict="pass" label="Best ref" compact />
              <p className="team-hub-badge-name">{bestRef.name}</p>
              <p className={`${REF_CARD_METRIC_DETAIL_CLASS} team-hub-badge-stat`}>
                <span className="tabular-nums">{formatPct(bestRef.winRate)}</span>
                {" · "}
                <StandoutMetricValue
                  tone={signedDeltaTone(bestRef.deltaPts)}
                  size="md"
                >
                  {formatSigned(bestRef.deltaPts)}
                </StandoutMetricValue>{" "}
                pts
              </p>
            </div>
          )}

          {worstRef && (
            <div className="team-hub-ref-badge">
              <StatusBadge verdict="fail" label="Worst ref" compact />
              <p className="team-hub-badge-name">{worstRef.name}</p>
              <p className={`${REF_CARD_METRIC_DETAIL_CLASS} team-hub-badge-stat`}>
                <span className="tabular-nums">{formatPct(worstRef.winRate)}</span>
                {" · "}
                <StandoutMetricValue
                  tone={signedDeltaTone(worstRef.deltaPts)}
                  size="md"
                >
                  {formatSigned(worstRef.deltaPts)}
                </StandoutMetricValue>{" "}
                pts
              </p>
            </div>
          )}
        </div>
      </div>
    </ClinicalCard>
  );
}
