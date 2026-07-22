import { SiteNavLink as Link } from "@/components/SiteNavLink";
import {
  FINDING_CATEGORY_LABELS,
  researchFindingHref,
  researchHubHref,
} from "@/lib/findings-shared";
import { relatedInsightsForLeague } from "@/lib/related-insights-server";
import type { ResearchFinding } from "@/lib/research";

type RelatedInsightsFooterProps = {
  league: ResearchFinding["league"];
};

export function RelatedInsightsFooter({ league }: RelatedInsightsFooterProps) {
  const articles = relatedInsightsForLeague(league, 3);
  if (articles.length === 0) return null;

  return (
    <footer
      className="section-block related-insights-footer"
      aria-labelledby={`related-insights-${league.toLowerCase()}`}
    >
      <h2 className="section-title" id={`related-insights-${league.toLowerCase()}`}>
        Related insights
      </h2>
      <p className="section-lead">
        Ranked {league} research findings from the Ref Watch dataset.
      </p>
      <ul className="related-insights-list mt-4 space-y-3">
        {articles.map((article) => (
          <li key={article.id} className="related-insights-item">
            <Link
              href={researchFindingHref(article.id, article.league)}
              className="related-insights-link font-medium text-zinc-800 underline-offset-2 hover:underline"
            >
              {article.headline}
            </Link>
            <p className="mt-1 text-sm text-zinc-600">{article.summary}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              {FINDING_CATEGORY_LABELS[article.category]}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4">
        <Link
          href={researchHubHref(league)}
          className="font-medium text-zinc-800 underline-offset-2 hover:underline"
        >
          Browse all {league} research findings
        </Link>
      </p>
    </footer>
  );
}
