import type { Metadata } from "next";
import { leagueHeroCopy } from "@/lib/league-hero-copy";
import { leagueHref, LEAGUES, type LeagueId } from "@/lib/leagues";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

export const DEFAULT_SITE_DESCRIPTION =
  "Referee and official analytics for the NBA, NHL, NFL, Premier League, La Liga, WNBA, and college hoops: historical scoring and whistle tendencies, ref profiles, and transparent methodology.";

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
  const description =
    leagueId === "cbb" && hub === "teams"
      ? `Browse referee history for ${league.label} teams: ${league.metrics.scoringColumn.toLowerCase()}, ${league.metrics.whistlePlain}, and home/away records.`
      : HUB_DESCRIPTIONS[hub](league);

  return buildPageMetadata({
    title: hubTitle(leagueId, hub),
    description,
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

export type SlateHubLeagueId = Extract<
  LeagueId,
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba"
>;

const SLATE_HUB_KEYWORDS: Record<SlateHubLeagueId, string[]> = {
  nba: ["NBA refs", "NBA referee crew", "referee analytics", "basketball officiating"],
  nhl: ["NHL officials", "NHL referee crew", "penalty analytics", "hockey officiating"],
  nfl: ["NFL officials", "NFL referee crew", "penalty analytics", "football officiating"],
  epl: ["Premier League referees", "EPL matchday", "referee analytics", "soccer officiating"],
  laliga: ["La Liga referees", "La Liga matchday", "referee analytics", "soccer officiating"],
  cbb: ["CBB referees", "college basketball refs", "NCAA officiating"],
  cfb: ["CFB officials", "college football refs", "NCAA officiating"],
  wnba: ["WNBA refs", "WNBA referee crew", "referee analytics", "basketball officiating"],
};

export function leagueSlateHubPath(leagueId: SlateHubLeagueId): string {
  return leagueId === "nba" ? "/nba" : `/${leagueId}`;
}

export function leagueSlateHubKeywords(leagueId: SlateHubLeagueId): string[] {
  const league = LEAGUES[leagueId];
  return [
    ...SLATE_HUB_KEYWORDS[leagueId],
    league.officialNoun,
    `${league.shortLabel} referee analytics`,
  ];
}

export function generateLeagueSlateMetadata(
  leagueId: SlateHubLeagueId,
  opts: {
    isOffseason: boolean;
    isPending?: boolean;
    slateDescription?: string;
  },
): Metadata {
  const copy = leagueHeroCopy(leagueId);
  const title = leagueSlatePageTitle(leagueId, opts);
  const description = opts.isOffseason
    ? copy.offseasonLead
    : (opts.slateDescription ?? copy.liveLead);

  return slatePageMetadata({
    title,
    description,
    path: leagueSlateHubPath(leagueId),
    keywords: leagueSlateHubKeywords(leagueId),
  });
}

export function leagueSlatePageTitle(
  leagueId: SlateHubLeagueId,
  opts: { isOffseason: boolean; isPending?: boolean },
): string {
  const copy = leagueHeroCopy(leagueId);
  if (opts.isOffseason) return copy.offseasonTitle;
  if (opts.isPending && copy.pendingTitle) return copy.pendingTitle;
  return copy.liveTitle;
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
  const title =
    leagueId === "cbb"
      ? `${teamName} referee splits`
      : `${teamName} ${league.officialNoun} crew splits`;
  const description =
    leagueId === "cbb"
      ? `How ${teamName} performs under different ${league.label} referees: scoring, ${league.metrics.whistlePlain}, and home/away records in the Ref Watch dataset.`
      : `How ${teamName} performs under different ${league.label} ${league.officialNoun} crews: scoring, ${league.metrics.whistlePlain}, and home/away records in the Ref Watch dataset.`;

  return buildPageMetadata({
    title,
    description,
    path,
    keywords: [teamName, league.shortLabel, leagueId === "cbb" ? "team referee splits" : "team crew splits", abbr],
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
    keywords: [leagueShort, "referee research", "historical pattern", "officiating analytics"],
  });
}

export function faqPageJsonLd(
  items: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function aboutPageJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Ref Watch",
    url: absoluteUrl("/about"),
    description:
      "Officiating intelligence for research, media, and league-adjacent products. Radical transparency, process-driven analytics, and empirical validation.",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function webPageJsonLd({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function refProfilePersonJsonLd({
  leagueId,
  name,
  slug,
  number,
}: {
  leagueId: LeagueId;
  name: string;
  slug: string;
  number?: string | number | null;
}): Record<string, unknown> {
  const league = LEAGUES[leagueId];
  const jobTitle =
    leagueId === "epl" || leagueId === "laliga"
      ? "Football referee"
      : `${league.officialNoun.charAt(0).toUpperCase()}${league.officialNoun.slice(1)}`;
  const numberSuffix =
    number != null && String(number).trim() !== "" ? ` (#${number})` : "";

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    ...(numberSuffix ? { alternateName: `${name}${numberSuffix}` } : {}),
    jobTitle,
    url: absoluteUrl(leagueHref(leagueId, `/refs/${slug}`)),
    memberOf: {
      "@type": "SportsOrganization",
      name: league.label,
    },
    worksFor: {
      "@type": "SportsOrganization",
      name: league.label,
    },
  };
}

export function teamProfileBreadcrumbJsonLd(
  leagueId: LeagueId,
  teamName: string,
  abbr: string,
): Record<string, unknown> {
  const league = LEAGUES[leagueId];
  return breadcrumbJsonLd([
    { name: `${league.shortLabel} home`, path: leagueHref(leagueId, "/") },
    { name: "Teams", path: leagueHref(leagueId, "/teams") },
    { name: teamName, path: leagueHref(leagueId, `/teams/${abbr}`) },
  ]);
}

export function teamProfileSportsTeamJsonLd(
  leagueId: LeagueId,
  teamName: string,
  abbr: string,
): Record<string, unknown> {
  const league = LEAGUES[leagueId];
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: teamName,
    sport: league.label,
    url: absoluteUrl(leagueHref(leagueId, `/teams/${abbr}`)),
    memberOf: {
      "@type": "SportsOrganization",
      name: league.label,
    },
  };
}

export function techArticleJsonLd({
  headline,
  description,
  path,
  datePublished,
}: {
  headline: string;
  description: string;
  path: string;
  datePublished?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline,
    description,
    url: absoluteUrl(path),
    datePublished: datePublished ?? "2026-07-01",
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    isAccessibleForFree: true,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function homepageWebPageJsonLd(): Record<string, unknown> {
  return webPageJsonLd({
    name: "Ref Watch - verified officiating analytics",
    description: DEFAULT_SITE_DESCRIPTION,
    path: "/",
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
  league: "NBA" | "NHL" | "WNBA" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB",
  slug: string,
): string {
  const leagueIdMap: Record<typeof league, LeagueId> = {
    NBA: "nba",
    NHL: "nhl",
    WNBA: "wnba",
    NFL: "nfl",
    EPL: "epl",
    LALIGA: "laliga",
    CBB: "cbb",
    CFB: "cfb",
  };
  return leagueHref(leagueIdMap[league], `/refs/${slug}`);
}
