import Link from "next/link";
import type { RankingsSynthesis } from "@/lib/rankings-synthesis";

export function RankingsInsightCards({
  synthesis,
  basePath = "",
}: {
  synthesis: RankingsSynthesis;
  basePath?: string;
}) {
  if (synthesis.insights.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">{synthesis.headline}</h2>
      <p className="section-lead">{synthesis.subhead}</p>
      <ul className="rankings-insight-grid">
        {synthesis.insights.map((insight) => (
          <li key={insight.id} className="rankings-insight-card">
            <p className="rankings-insight-kicker">{insight.title}</p>
            {insight.refSlug && insight.refName ? (
              <Link
                href={`${basePath}/refs/${insight.refSlug}`}
                className="rankings-insight-name"
              >
                {insight.refName}
              </Link>
            ) : insight.refName ? (
              <p className="rankings-insight-name">{insight.refName}</p>
            ) : null}
            {insight.statValue && (
              <p className="rankings-insight-metric" aria-label={insight.statLabel}>
                {insight.statValue}
              </p>
            )}
            <p className="rankings-insight-body">{insight.body}</p>
          </li>
        ))}
      </ul>
      <p className="rankings-insight-summary">{synthesis.leagueSummary}</p>
    </section>
  );
}
