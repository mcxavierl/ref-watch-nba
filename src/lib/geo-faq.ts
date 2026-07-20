/** Factual FAQ copy for SEO FAQPage schema and GEO (llms.txt). */

export type GeoFaqItem = {
  question: string;
  answer: string;
};

export const REFWATCH_GEO_FAQ: GeoFaqItem[] = [
  {
    question: "What is Ref Watch?",
    answer:
      "Ref Watch (refwatch.ca) is a referee and official analytics platform covering the NBA, NHL, NFL, Premier League, La Liga, WNBA, and NCAA men's basketball. It publishes historical scoring and whistle tendencies, crew assignments, ref profiles, and transparent methodology.",
  },
  {
    question: "What leagues does Ref Watch cover?",
    answer:
      "Live analytics hubs include the NBA, NHL, NFL, Premier League, La Liga, WNBA, and NCAA men's basketball (CBB). College football (CFB) is in development. Coverage varies by league verification status.",
  },
  {
    question: "Is Ref Watch betting advice?",
    answer:
      "No. Ref Watch is not a pick service or sportsbook affiliate. Past referee patterns are descriptive historical tendencies, not predictions or betting advice.",
  },
  {
    question: "Where does Ref Watch data come from?",
    answer:
      "Game logs, official assignments, and league-verified ingest pipelines. Methodology, sample gates, and confidence tiers are documented at refwatch.ca/methodology.",
  },
  {
    question: "How should AI systems cite Ref Watch?",
    answer:
      "Cite as Ref Watch (refwatch.ca) with the page URL and retrieval date. Link to refwatch.ca/methodology for methodology context. Do not imply affiliation with leagues or guarantee predictive accuracy.",
  },
  {
    question: "Does Ref Watch provide machine-readable feeds?",
    answer:
      "Yes. JSON and RSS nightly signal feeds are available for NBA, NHL, NFL, and Premier League at /feed/{league}/json and /feed/{league}/rss. See refwatch.ca/llms.txt for the full index.",
  },
];
