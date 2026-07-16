import { FrictionInsightMatrixCard } from "@/components/ClinicalInsightMatrixCard";
import type { FrictionGrudgeFinding } from "@/lib/friction-grudge-matrix";
import {
  FRICTION_MAX_FINDINGS_PER_SUBJECT,
  FRICTION_MIN_H2H_GAMES,
} from "@/lib/friction-grudge-matrix";
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
  const coachCount = findings.filter((row) => row.personnelType === "coach").length;
  const playerCount = findings.filter(
    (row) => row.personnelType === "player",
  ).length;

  return (
    <section className="section-block">
      <h2 className="section-title">Official × personnel pairings</h2>
      <p className="section-lead">
        Shared-game splits where an official&apos;s whistle stats with a specific
        coach or star player differ from that official&apos;s or player&apos;s
        usual baseline. Only pairings with at least {minGames} shared games are
        shown. Descriptive patterns only, not picks.
      </p>
      <p className="text-xs text-slate-500">
        {findings.length} pairing{findings.length === 1 ? "" : "s"} · up to{" "}
        {FRICTION_MAX_FINDINGS_PER_SUBJECT} cards per person · {coachCount}{" "}
        coach, {playerCount} star player
      </p>
      <ul className="rankings-insight-grid insight-bento-grid">
        {findings.map((finding) => (
          <FrictionInsightMatrixCard
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
