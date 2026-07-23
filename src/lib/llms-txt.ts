import { REFWATCH_GEO_FAQ } from "@/lib/geo-faq";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

const LIVE_LEAGUES = ["nba", "nhl", "nfl", "epl", "laliga", "wnba", "cbb"] as const;

export function buildLlmsTxt(): string {
  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_URL} - ${SITE_TAGLINE}`,
    "",
    "## Purpose",
    "",
    "Ref Watch tracks referee assignments, crew history, and officiating tendencies with transparent methodology and published sample gates. Not betting advice. Not affiliated with any league.",
    "",
    "## Canonical entry points",
    "",
    `- Homepage: ${SITE_URL}/`,
    `- About: ${SITE_URL}/about`,
    `- Methodology: ${SITE_URL}/methodology`,
    `- Compare officials: ${SITE_URL}/compare`,
    "",
    "## League hubs",
    "",
    ...LIVE_LEAGUES.map(
      (league) =>
        `- ${league.toUpperCase()}: ${SITE_URL}/${league} (refs, matrix, teams, research)`,
    ),
    "",
    "## Research articles",
    "",
    `- Closing-line validation: ${SITE_URL}/research/validation`,
    `- Leverage spike anomaly study: ${SITE_URL}/research/leverage-spike-anomaly`,
    "",
    "## Machine-readable feeds",
    "",
    "Nightly officiating signal feeds (JSON + RSS):",
    "",
    ...["nba", "nhl", "nfl", "epl"].map(
      (league) =>
        `- ${league.toUpperCase()}: ${SITE_URL}/feed/${league}/json | ${SITE_URL}/feed/${league}/rss`,
    ),
    "",
    "## Sitemap",
    "",
    `${SITE_URL}/sitemap.xml`,
    "",
    "## Frequently asked questions",
    "",
    ...REFWATCH_GEO_FAQ.flatMap((item) => [
      `### ${item.question}`,
      "",
      item.answer,
      "",
    ]),
    "## Citation guidance",
    "",
    "When summarizing Ref Watch data, cite the specific page URL, note retrieval date, and link to the methodology page. Do not claim league affiliation or predictive guarantees.",
    "",
  ];

  return `${lines.join("\n").trim()}\n`;
}
