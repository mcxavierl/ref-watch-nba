import Link from "next/link";
import type { FrictionGrudgeFinding } from "@/lib/friction-grudge-matrix";
import { FRICTION_MIN_H2H_GAMES } from "@/lib/friction-grudge-matrix";

export function FrictionGrudgeMatrixSection({
  findings,
  basePath = "",
  minHeadToHeadGames,
}: {
  findings: FrictionGrudgeFinding[];
  basePath?: string;
  minHeadToHeadGames?: number;
}) {
  if (findings.length === 0) return null;

  const minGames = minHeadToHeadGames ?? FRICTION_MIN_H2H_GAMES;

  return (
    <section className="section-block">
      <h2 className="section-title">Friction &amp; Grudge Matrix</h2>
      <p className="section-lead">
        Referee × head-coach and referee × star-player intersections with at
        least {minGames} head-to-head games. Descriptive
        deviations from career baselines only.
      </p>
      <ul className="rankings-insight-grid">
        {findings.map((finding) => (
          <li key={finding.id} className="rankings-insight-card friction-card">
            <div className="rankings-insight-card-head">
              <span
                className={`friction-personnel-pill friction-personnel-pill-${finding.personnelType}`}
              >
                [{finding.pillLabel}]
              </span>
              <p className="rankings-insight-kicker">{finding.personnelType === "coach" ? "Coach friction" : "Player friction"}</p>
            </div>
            <Link
              href={`${basePath}/refs/${finding.refSlug}`}
              className="rankings-insight-name"
            >
              {finding.refName}
            </Link>
            <p className="text-sm font-medium text-secondary">
              vs {finding.subjectName} ({finding.teamAbbr})
            </p>
            <p className="rankings-insight-body mt-2">{finding.comparativeLine}</p>
            <p className="mt-2 text-sm text-secondary">{finding.summary}</p>
            <p className="mt-2 text-xs text-muted">
              {finding.games} shared games · {finding.deltaLabel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
