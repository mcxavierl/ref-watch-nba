import { SiteNavLink as Link } from "@/components/SiteNavLink";
import type { CbbWhistleOutlier } from "@/lib/cbb-whistle-matrix";
import { CBB_WHISTLE_MATRIX_MIN_GAMES } from "@/lib/cbb-whistle-matrix";
import type { CfbPenaltyOutlier } from "@/lib/cfb-penalty-engine";
import { CFB_PENALTY_ENGINE_MIN_GAMES } from "@/lib/cfb-penalty-engine";

function kindLabel(outlier: CbbWhistleOutlier | CfbPenaltyOutlier): string {
  if (outlier.kind === "crew-chief-tech-rate") return "Crew chief tech rate";
  if (outlier.kind === "high-stakes-ft-variance") return "High-stakes FT variance";
  if (outlier.kind === "holding-pi-variance") return "Holding/PI variance";
  return "Home penalty suppression";
}

export function CbbWhistleMatrixSection({
  outliers,
  basePath = "",
}: {
  outliers: CbbWhistleOutlier[];
  basePath?: string;
}) {
  if (outliers.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">CBB Whistle Matrix</h2>
      <p className="section-lead">
        Conference-adjusted crew-chief technical foul rates and free-throw
        differential variance in rivalry/tournament games. Officials need at
        least {CBB_WHISTLE_MATRIX_MIN_GAMES} games before outlier flagging.
      </p>
      <ul className="rankings-insight-grid">
        {outliers.map((outlier) => (
          <li key={outlier.id} className="rankings-insight-card friction-card">
            <p className="rankings-insight-kicker">{kindLabel(outlier)}</p>
            <Link
              href={`${basePath}/refs/${outlier.refSlug}`}
              className="rankings-insight-name"
            >
              {outlier.refName}
            </Link>
            <p className="text-sm font-medium text-secondary">
              {outlier.conference} · {outlier.games} games
            </p>
            <p className="rankings-insight-body mt-2">{outlier.headline}</p>
            <p className="mt-2 text-sm text-secondary">{outlier.summary}</p>
            <p className="mt-2 text-xs text-muted">
              {outlier.metricValue} vs {outlier.baselineValue} baseline ·{" "}
              {outlier.deltaLabel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CfbPenaltyEngineSection({
  outliers,
  basePath = "",
}: {
  outliers: CfbPenaltyOutlier[];
  basePath?: string;
}) {
  if (outliers.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">CFB Penalty Engine</h2>
      <p className="section-lead">
        Holding/PI call variance by down-distance bucket and home-team penalty
        suppression vs conference baselines. Minimum{" "}
        {CFB_PENALTY_ENGINE_MIN_GAMES} officiated games required.
      </p>
      <ul className="rankings-insight-grid">
        {outliers.map((outlier) => (
          <li key={outlier.id} className="rankings-insight-card friction-card">
            <p className="rankings-insight-kicker">{kindLabel(outlier)}</p>
            <Link
              href={`${basePath}/refs/${outlier.refSlug}`}
              className="rankings-insight-name"
            >
              {outlier.refName}
            </Link>
            <p className="text-sm font-medium text-secondary">
              {outlier.conference}
              {outlier.bucket ? ` · ${outlier.bucket.replace(/_/g, " ")}` : ""} ·{" "}
              {outlier.games} games
            </p>
            <p className="rankings-insight-body mt-2">{outlier.headline}</p>
            <p className="mt-2 text-sm text-secondary">{outlier.summary}</p>
            <p className="mt-2 text-xs text-muted">
              {outlier.metricValue} vs {outlier.baselineValue} baseline ·{" "}
              {outlier.deltaLabel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
