import Link from "next/link";
import {
  formatMatrixHighlightBaseline,
  type MatrixExtremeHighlight,
} from "@/lib/ref-team-matrix";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import "@/components/insight-card.css";

type MatrixExtremeInsightCardsProps = {
  extremes: MatrixExtremeHighlight[];
  basePath: string;
  entityLabel?: "ref" | "official";
};

export function MatrixExtremeInsightCards({
  extremes,
  basePath,
  entityLabel = "ref",
}: MatrixExtremeInsightCardsProps) {
  if (extremes.length === 0) return null;

  const withLabel = entityLabel === "official" ? "official" : "ref";

  return (
    <ul className="matrix-extreme-insight-grid">
      {extremes.map((item) => {
        const tone = item.kind === "high" ? "positive" : "negative";
        const kicker = item.kind === "high" ? "Above baseline" : "Below baseline";

        return (
          <li key={`${item.refSlug}-${item.teamAbbr}`}>
            <article
              className="insight-card insight-card--inline matrix-extreme-insight-card"
              data-tone={tone}
            >
              <header className="insight-card-head">
                <p className="insight-card-kicker">{kicker}</p>
              </header>
              <p className="insight-card-hero">
                <span className={`insight-card-hero-value insight-card-hero-value--${tone}`}>
                  {formatSigned(item.deltaPts)}
                </span>
                <span className="insight-card-hero-label">vs team baseline</span>
              </p>
              <p className="insight-card-headline">
                <Link
                  href={`${basePath}/refs/${item.refSlug}#close-game`}
                  className="insight-card-link"
                >
                  {item.refName}
                </Link>{" "}
                ×{" "}
                <Link
                  href={`${basePath}/teams/${item.teamAbbr}`}
                  className="insight-card-link"
                >
                  {item.teamLabel}
                </Link>
              </p>
              <p className="insight-card-baseline matrix-extreme-insight-baseline">
                {withLabel}×team {item.wins}-{item.losses} ({formatPct(item.winRate)}) across{" "}
                {item.games} games · team sample {formatMatrixHighlightBaseline(item)}
              </p>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
