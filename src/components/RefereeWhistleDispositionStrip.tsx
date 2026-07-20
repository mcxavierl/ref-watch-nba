import { isWhistleTaxonomyLeague } from "@/config/penalty-types";
import {
  computeRefWhistleDisposition,
  LWIS_MIN_HIGH_LEVERAGE_EVENTS,
  profileDisposition,
  resolveRefLwisPeerContext,
  type WhistleDispositionMetrics,
} from "@/lib/whistle-disposition";
import type { LeagueId } from "@/lib/leagues";
import { formatSigned } from "@/lib/stats-utils";
import type { RefProfile, RefStatsFile } from "@/lib/types";

type RefereeWhistleDispositionStripProps = {
  profile: RefProfile;
  leagueId: LeagueId;
  stats: RefStatsFile;
  scopedSeasons: string[];
  showMetrics?: boolean;
  className?: string;
  layout?: "strip" | "grid";
};

function DispositionMetrics({
  metrics,
  layout = "strip",
}: {
  metrics: WhistleDispositionMetrics;
  layout?: "strip" | "grid";
}) {
  const gridCellClass =
    layout === "grid" ? " whistle-disposition-metric--grid-cell" : "";

  const adminMetric = (
    <div
      className={`whistle-disposition-metric whistle-disposition-metric--admin${gridCellClass}`}
    >
        <span className="whistle-disposition-metric-label">
          Administrative rate (freq)
        </span>
        <span className="whistle-disposition-metric-value">
          {metrics.avgAdministrativePerGame.toFixed(1)}
        </span>
        <span className="whistle-disposition-metric-delta">
          {formatSigned(metrics.administrativeDelta)} vs avg
        </span>
    </div>
  );

  const lwisMetric = (
    <div
      className={`whistle-disposition-metric whistle-disposition-metric--lwis${
        metrics.isHighImpactOutlier
          ? " whistle-disposition-metric--lwis-high-impact"
          : ""
      }${gridCellClass}`}
    >
        <span className="whistle-disposition-metric-label">
          Impact score (leverage-weighted)
          {metrics.isHighImpactOutlier ? (
            <span className="whistle-disposition-high-impact-badge">
              High impact
            </span>
          ) : null}
        </span>
        {metrics.impactScoreSurfaced ? (
          <>
            <span className="whistle-disposition-metric-value">
              {metrics.lwisPerGame.toFixed(3)}
            </span>
            <span className="whistle-disposition-metric-delta">
              {formatSigned(metrics.lwisDelta)} vs league LWIS mean ·{" "}
              {metrics.highLeverageEventCount} high-leverage events
              {metrics.lwisZScore !== null
                ? ` · z=${formatSigned(metrics.lwisZScore)}`
                : ""}
            </span>
          </>
        ) : (
          <span className="whistle-disposition-metric-delta">
            Withheld - needs {LWIS_MIN_HIGH_LEVERAGE_EVENTS} high-leverage
            subjective events ({metrics.highLeverageEventCount} recorded)
          </span>
        )}
    </div>
  );

  if (layout === "grid") {
    return (
      <>
        {adminMetric}
        {lwisMetric}
      </>
    );
  }

  return (
    <div className="whistle-disposition-dual whistle-disposition-dual--profile">
      {adminMetric}
      <div className="whistle-disposition-divider" aria-hidden />
      {lwisMetric}
    </div>
  );
}

export function RefereeWhistleDispositionStrip({
  profile,
  leagueId,
  stats,
  scopedSeasons,
  showMetrics = true,
  className = "",
  layout = "strip",
}: RefereeWhistleDispositionStripProps) {
  if (!showMetrics || !isWhistleTaxonomyLeague(leagueId)) return null;

  const rawMetrics =
    computeRefWhistleDisposition(profile, leagueId, scopedSeasons) ??
    profileDisposition(profile, leagueId);
  if (!rawMetrics || rawMetrics.dispositionSampleGames < 10) return null;

  const metrics = resolveRefLwisPeerContext(
    profile,
    stats,
    leagueId,
    scopedSeasons,
    rawMetrics,
  );

  if (layout === "grid") {
    return <DispositionMetrics metrics={metrics} layout="grid" />;
  }

  return (
    <div className={`ref-whistle-disposition-strip ${className}`.trim()}>
      <p className="ref-whistle-disposition-strip__lead">
        Officiating style - administrative rate (frequency) vs leverage-weighted
        game-flow impact (LWIS = Σ(|ΔWPA| × LeverageWeight) on subjective calls).
      </p>
      <DispositionMetrics metrics={metrics} layout="strip" />
    </div>
  );
}
