export const SITE_NAME = "Ref Watch";

/** Primary marketing tagline used on hero, footer bar, OG, and SEO surfaces. */
export const SITE_TAGLINE =
  "Analytics and intelligence, bias modeling for the 3rd team on the field, court, or rink, depending on the league.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://refwatch.ca";

export const AFFILIATION_DISCLAIMER =
  "Not affiliated with the NBA, NHL, NFL, Premier League, or NCAA. Entertainment and information only.";

export const GAMBLING_DISCLAIMER =
  "Not betting advice. Past referee patterns do not predict future results. Free confidential help across Canada: ConnexOntario 1-866-531-2600 (connexontario.ca, 24/7).";

export const SYNDICATION_DISCLAIMER = `${AFFILIATION_DISCLAIMER} ${GAMBLING_DISCLAIMER}`;

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
