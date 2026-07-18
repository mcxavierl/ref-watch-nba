import { LEAGUE_IDS, LEAGUES, type LeagueId } from "@/lib/leagues";
import { LEAGUE_MANIFEST, ROUTED_LEAGUE_MANIFEST_IDS } from "@/lib/league-manifest";

/** Hub segments with a dedicated page under /{league}/. */
export const HUB_SEGMENTS = [
  "refs",
  "matrix",
  "teams",
  "research",
] as const;

/** Leagues that ship full hub routes in the App Router. */
export const ROUTED_LEAGUE_IDS = ROUTED_LEAGUE_MANIFEST_IDS;

export type RoutedLeagueId = (typeof ROUTED_LEAGUE_IDS)[number];

/** Coming-soon leagues linked from roadmap catalog but without live hubs. */
export const COMING_SOON_LEAGUE_IDS = [
  "wnba",
  "mlb",
  "cfb",
] as const satisfies readonly LeagueId[];

/** @deprecated Use COMING_SOON_LEAGUE_IDS */
export const GATED_COLLEGE_LEAGUE_IDS = ["cbb", "cfb"] as const satisfies readonly LeagueId[];

export type SiteRouteRedirect = {
  source: string;
  destination: string;
};

/** Legacy or alias paths that must not 404 (handled via next.config redirects). */
export function siteRouteRedirects(): SiteRouteRedirect[] {
  const redirects: SiteRouteRedirect[] = [];

  for (const leagueId of ROUTED_LEAGUE_IDS) {
    const prefix = LEAGUES[leagueId].pathPrefix;
    redirects.push({
      source: `${prefix}/rankings`,
      destination: `${prefix}/research/tendencies`,
    });
    redirects.push({
      source: `${prefix}/trends`,
      destination: `${prefix}/research/trends`,
    });
    redirects.push({
      source: `${prefix}/insights`,
      destination: `${prefix}/research/tendencies`,
    });
    redirects.push({
      source: `${prefix}/crews`,
      destination: `${prefix}/refs`,
    });
    redirects.push({
      source: `${prefix}/compare`,
      destination: "/compare",
    });
  }

  for (const leagueId of COMING_SOON_LEAGUE_IDS) {
    const prefix = LEAGUES[leagueId].pathPrefix;
    redirects.push({ source: prefix, destination: "/" });
    redirects.push({ source: `${prefix}/:path*`, destination: "/" });
  }

  return redirects;
}

/** Static app routes that must resolve to a page.tsx (not redirect-only). */
export function canonicalSiteRoutePaths(): string[] {
  const paths = [
    "/",
    "/compare",
    "/methodology",
    "/partners",
    "/overview",
    "/ncaa/integrity-audit",
  ];

  for (const leagueId of ROUTED_LEAGUE_IDS) {
    const prefix = LEAGUES[leagueId].pathPrefix;
    paths.push(prefix);
    for (const segment of HUB_SEGMENTS) {
      paths.push(`${prefix}/${segment}`);
    }
    paths.push(`${prefix}/research/tendencies`);
    paths.push(`${prefix}/research/trends`);
    paths.push(`${prefix}/research/findings`);
  }

  return paths;
}

/** Map a URL path to its App Router page module. */
export function routePathToPageModule(routePath: string): string {
  const normalized = routePath.replace(/\/$/, "") || "/";
  if (normalized === "/") return "src/app/page.tsx";
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length >= 1 && LEAGUE_MANIFEST[segments[0] as LeagueId]?.routed) {
    if (segments.length === 1) return "src/app/[league]/page.tsx";
    return `src/app/[league]/${segments.slice(1).join("/")}/page.tsx`;
  }
  return `src/app/${segments.join("/")}/page.tsx`;
}

/** Nav hrefs from league section nav that must resolve (page or redirect). */
export function siteNavHrefPaths(): string[] {
  const paths: string[] = [];
  for (const leagueId of LEAGUE_IDS) {
    const prefix = LEAGUES[leagueId].pathPrefix;
    if ((COMING_SOON_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)) {
      paths.push(prefix, `${prefix}/research/tendencies`);
      continue;
    }
    if ((ROUTED_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)) {
      paths.push(
        prefix,
        `${prefix}/teams`,
        `${prefix}/matrix`,
        `${prefix}/refs`,
        `${prefix}/research/tendencies`,
      );
    }
  }
  return paths;
}
