import Link from "next/link";
import {
  FINDING_CATEGORY_LABELS,
  researchFindingHref,
  researchHubHref,
  type FindingCategory,
} from "@/lib/findings-shared";
import { relatedInsightsForLeague } from "@/lib/related-insights-server";
import type { ResearchFinding } from "@/lib/research";
import "./cbb-research-terminal.css";

const RESEARCH_FEED_CATEGORY_TAGS: Partial<Record<FindingCategory, string>> = {
  "league-trend": "League Trend",
  "ref-outlier": "Ref Outlier",
  "team-crew": "Team Crew",
  "whistle-extreme": "Whistle Trend",
  "scoring-extreme": "Scoring Trend",
  "ats-edge": "ATS Edge",
  "ou-edge": "O/U Edge",
  "ref-team-split": "Ref-Team Split",
  "marquee-efficiency": "Marquee",
  "coach-friction": "Coach Friction",
  "player-friction": "Player Friction",
};

function categoryTag(category: FindingCategory): string {
  return RESEARCH_FEED_CATEGORY_TAGS[category] ?? FINDING_CATEGORY_LABELS[category];
}

function refProfileHref(finding: ResearchFinding): string {
  const refLink = finding.links.find((link) => /\/refs\//.test(link.href));
  if (refLink) return refLink.href;
  return researchFindingHref(finding.id, finding.league);
}

export function CbbResearchFeed() {
  const articles = relatedInsightsForLeague("CBB", 4);
  if (articles.length === 0) return null;

  return (
    <section
      className="cbb-research-feed section-block"
      aria-labelledby="cbb-research-feed-heading"
    >
      <header className="cbb-research-feed-head">
        <p className="cbb-research-terminal-eyebrow">Research feed</p>
        <h2 className="section-title" id="cbb-research-feed-heading">
          Related insights
        </h2>
        <p className="section-lead">
          Ranked CBB findings from verified game logs. Open a profile for full splits.
        </p>
      </header>

      <ul className="cbb-research-feed-grid" role="list">
        {articles.map((article) => (
          <li key={article.id}>
            <article className="cbb-research-feed-card">
              <span className="cbb-research-feed-tag">
                {categoryTag(article.category)}
              </span>
              <h3 className="cbb-research-feed-headline">{article.headline}</h3>
              <p className="cbb-research-feed-summary">{article.summary}</p>
              <Link
                href={refProfileHref(article)}
                className="cbb-research-feed-link"
              >
                Read More
              </Link>
            </article>
          </li>
        ))}
      </ul>

      <p className="cbb-research-feed-more">
        <Link href={researchHubHref("CBB")} className="site-footer-inline-link">
          Browse all CBB research findings
        </Link>
      </p>
    </section>
  );
}
