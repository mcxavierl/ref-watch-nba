import type { MatrixExtremeHighlight } from "@/lib/ref-team-matrix";
import { MatrixExtremeSplitCards } from "@/components/StandoutMetric";

export function MatrixExtremeSection({
  extremes,
  basePath,
  title,
  lead,
  entityLabel = "ref",
}: {
  extremes: MatrixExtremeHighlight[];
  basePath: string;
  title: string;
  lead: string;
  entityLabel?: "ref" | "official";
}) {
  if (extremes.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">{title}</h2>
      <p className="section-lead">{lead}</p>
      <MatrixExtremeSplitCards
        extremes={extremes}
        basePath={basePath}
        entityLabel={entityLabel}
      />
    </section>
  );
}
