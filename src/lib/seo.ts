import type { Metadata } from "next";
import { leagueHref, LEAGUES, type LeagueId } from "@/lib/leagues";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

export const DEFAULT_SITE_DESCRIPTION =
  "Referee and official analytics for the NBA, NHL, NFL, and Premier League: nightly crews, historical scoring and whistle tendencies, ref profiles, and transparent methodology.";

export type HubPage =
  | "refs"
  | "crews"
  | "matrix"
  | "insights"
  | "teams"
  | "rankings"
  | "trends"
  | "research";

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
};

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
}: BuildPageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const ogTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      type: "website",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

const HUB_DESCRIPTIONS: Record<
  HubPage,
  (league: (typeof LEAGUES)[LeagueId]) => string
> = {
  refs: (l) =>
    `Browse every ${l.label} ${l.officialNoun} and recurring crew in the Ref Watch dataset. Historical scoring, whistle, and ATS/O-U splits with sample gates.`,
  crews: (l) =>
    `Recurring ${l.label} ${l.officialNoun} crews ranked by ${l.metrics.scoringColumn.toLowerCase()}, ${l.metrics.whistleColumn.toLowerCase()}, and game pace.`,
  matrix: (l) =>
    `Cross-tab matrix of ${l.label} team records when each ${l.officialNoun} worked their games. Minimum sample gates; descriptive historical splits only.`,
  insights: (l) =>
    `${l.label} ${l.officialNoun} tendencies, league trends, and ranked research findings from the Ref Watch dataset.`,
  teams: (l) =>
    `Browse ${l.officialNoun} crew history for ${l.label} teams: ${l.metrics.scoringColumn.toLowerCase()}, ${l.metrics.whistlePlain}, and home/away records.`,
  rankings: (l) =>
    `${l.label} ${l.officialNounPlural} ranked by scoring pace, whistle rate, and over tendencies. Sample-gated historical analytics.`,
  trends: (l) =>
    `Multi-season ${l.label} scoring and ${l.metrics.whistlePlain} trends from Ref Watch league baselines.`,
  research: (l) =>
    `Ranked historical ${l.label} ${l.officialNoun} patterns and dataset findings. Transparent methodology and confidence tiers.`,
};

const HUB_KEYWORDS: Record<
  HubPage,
  (league: (typeof LEAGUES)[LeagueId]) => string[]
> = {
  refs: (l) => [
    l.shortLabel,
    `${l.officialNoun} stats`,
    `${l.officialNoun} analytics`,
    "referee crew",
    "officiating tendencies",
  ],
  crews: (l) => [
    l.shortLabel,
    "referee crew",
    "officiating crew",
    l.metrics.whistlePlain,
    "pace analytics",
  ],
  matrix: (l) => [
    l.shortLabel,
    "ref team matrix",
    `${l.officialNoun} team splits`,
    "historical records",
  ],
  insights: (l) => [
    l.shortLabel,
    "referee analytics",
    "officiating trends",
    "research findings",
  ],
  teams: (l) => [l.shortLabel, "team referee splits", "crew history", "home away"],
  rankings: (l) => [
    l.shortLabel,
    `${l.officialNoun} rankings`,
    "tendency index",
    "over under rate",
  ],
  trends: (l) => [l.shortLabel, "league trends", l.metrics.whistlePlain, "scoring trends"],
  research: (l) => [
    l.shortLabel,
    "referee research",
    "historical patterns",
    "dataset findings",
  ],
};

function hubTitle(leagueId: LeagueId, hub: HubPage): string {
  const league = LEAGUES[leagueId];
  if (hub === "refs") {
    const noun =
      leagueId === "epl"
        ? "referees"
        : league.officialNounPlural;
    return `${league.shortLabel} ${noun}`;
  }
  if (hub === "crews") return `${league.shortLabel} crew dynamics`;
  if (hub === "matrix")
    return `${league.shortLabel} ${league.officialNoun} × team matrix`;
  if (hub === "insights") return `${league.shortLabel} insights`;
  if (hub === "teams") return `All ${league.shortLabel} teams`;
  if (hub === "rankings")
    return `${league.shortLabel} ${league.officialNoun} tendency index`;
  if (hub === "trends") return `${league.shortLabel} league trends`;
  return `${league.shortLabel} research findings`;
}

export function hubPageMetadata(leagueId: LeagueId, hub: HubPage): Metadata {
  const league = LEAGUES[leagueId];
  const path = leagueHref(leagueId, hub === "research" ? "/research" : `/${hub}`);
  return buildPageMetadata({
    title: hubTitle(leagueId, hub),
    description: HUB_DESCRIPTIONS[hub](league),
    path,
    keywords: HUB_KEYWORDS[hub](league),
  });
}

export function slatePageMetadata({
  title,
  description,
  path,
  keywords,
}: BuildPageMetadataInput): Metadata {
  return buildPageMetadata({ title, description, path, keywords });
}

export function entityNotFoundMetadata(
  entity: "ref" | "official" | "team" | "finding",
  leagueId: LeagueId,
): Metadata {
  const league = LEAGUES[leagueId];
  const label =
    entity === "team"
      ? "Team"
      : entity === "finding"
        ? "Finding"
        : league.officialNoun.charAt(0).toUpperCase() +
          league.officialNoun.slice(1);
  return {
    title: `${label} not found`,
    robots: { index: false, follow: false },
  };
}

export function refProfileMetadata({
  leagueId,
  slug,
  name,
  number,
  games,
  overRateFormatted,
  overBaseline,
  atsLabel,
}: {
  leagueId: LeagueId;
  slug: string;
  name: string;
  number?: string | number | null;
  games: number;
  overRateFormatted: string;
  overBaseline: number;
  atsLabel?: string;
}): Metadata {
  const league = LEAGUES[leagueId];
  const path = leagueHref(leagueId, `/refs/${slug}`);
  const numberSuffix =
    number != null && String(number).trim() !== "" ? ` (#${number})` : "";
  const title = `${name}${numberSuffix}`;
  const atsPart = atsLabel ? `, ${atsLabel}` : "";
  const description = `${name}: ${games} ${league.metrics.gamesColumn.toLowerCase()}, ${overRateFormatted} over ${overBaseline}${atsPart}. Historical ${league.label} ${league.officialNoun} analytics: scoring, ${league.metrics.whistlePlain}, ATS/O-U splits, and close-game tendencies.`;

  return buildPageMetadata({
    title,
    description,
    path,
    keywords: [
      name,
      league.shortLabel,
      `${league.officialNoun} stats`,
      `${league.officialNoun} profile`,
      "officiating analytics",
    ],
  });
}

export function teamProfileMetadata({
  leagueId,
  teamName,
  abbr,
}: {
  leagueId: LeagueId;
  teamName: string;
  abbr: string;
}): Metadata {
  const league = LEAGUES[leagueId];
  const path = leagueHref(leagueId, `/teams/${abbr}`);
  return buildPageMetadata({
    title: `${teamName} ${league.officialNoun} crew splits`,
    description: `How ${teamName} performs under different ${league.label} ${league.officialNoun} crews: scoring, ${league.metrics.whistlePlain}, and home/away records in the Ref Watch dataset.`,
    path,
    keywords: [teamName, league.shortLabel, "team crew splits", abbr],
  });
}

export function researchFindingMetadata({
  headline,
  summary,
  path,
  leagueShort,
}: {
  headline: string;
  summary: string;
  path: string;
  leagueShort: string;
}): Metadata {
  return buildPageMetadata({
    title: headline,
    description: summary,
    path,
    keywords: [leagueShort, "referee research", "historical pattern"],
  });
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_SITE_DESCRIPTION,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_SITE_DESCRIPTION,
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function refProfileBreadcrumbJsonLd(
  leagueId: LeagueId,
  refName: string,
  slug: string,
): Record<string, unknown> {
  const league = LEAGUES[leagueId];
  return breadcrumbJsonLd([
    { name: `${league.shortLabel} home`, path: leagueHref(leagueId, "/") },
    {
      name: league.officialNounPlural.charAt(0).toUpperCase() +
        league.officialNounPlural.slice(1),
      path: leagueHref(leagueId, "/refs"),
    },
    { name: refName, path: leagueHref(leagueId, `/refs/${slug}`) },
  ]);
}

export function leagueRefPath(
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB",
  slug: string,
): string {
  const leagueIdMap: Record<typeof league, LeagueId> = {
    NBA: "nba",
    NHL: "nhl",
    NFL: "nfl",
    EPL: "epl",
    LALIGA: "laliga",
    CBB: "cbb",
    CFB: "cfb",
  };
  return leagueHref(leagueIdMap[league], `/refs/${slug}`);
}
