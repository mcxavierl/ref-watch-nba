import { ClinicalInsightMatrixCard } from "@/components/ClinicalInsightMatrixCard";
import type { FrictionGrudgeFinding } from "@/lib/friction-grudge-matrix";
import { FRICTION_MIN_H2H_GAMES } from "@/lib/friction-grudge-matrix";
import type { LeagueId } from "@/lib/leagues";

export function FrictionGrudgeMatrixSection({
  findings,
  leagueId,
  basePath = "",
  minHeadToHeadGames,
}: {
  findings: FrictionGrudgeFinding[];
  leagueId: LeagueId;
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
      <ul className="rankings-insight-grid insight-bento-grid">
        {findings.map((finding) => (
          <ClinicalInsightMatrixCard
            key={finding.id}
            finding={finding}
            leagueId={leagueId}
            basePath={basePath}
          />
        ))}
      </ul>
    </section>
  );
}
