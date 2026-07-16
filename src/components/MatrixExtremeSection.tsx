import {
  ClinicalInsightMatrixCard,
  matrixExtremeToMatrixCard,
} from "@/components/ClinicalInsightMatrixCard";
import type { LeagueId } from "@/lib/leagues";
import type { MatrixExtremeHighlight } from "@/lib/ref-team-matrix";

export function MatrixExtremeSection({
  extremes,
  basePath,
  title,
  lead,
  leagueId,
}: {
  extremes: MatrixExtremeHighlight[];
  basePath: string;
  title: string;
  lead: string;
  entityLabel?: "ref" | "official";
  leagueId: LeagueId;
}) {
  if (extremes.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">{title}</h2>
      <p className="section-lead">{lead}</p>
      <ul className="rankings-insight-grid insight-bento-grid">
        {extremes.flatMap((item) => {
          const model = matrixExtremeToMatrixCard(item, leagueId);
          if (!model) return [];

          return [
            <ClinicalInsightMatrixCard
              key={`${item.refSlug}-${item.teamAbbr}`}
              model={model}
              leagueId={leagueId}
              basePath={basePath}
            />,
          ];
        })}
      </ul>
    </section>
  );
}
