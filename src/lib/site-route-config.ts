import { LEAGUE_IDS, LEAGUES, type LeagueId } from "@/lib/leagues";

/** Hub segments with a dedicated page (insights aliases rankings via redirect). */
export const HUB_SEGMENTS = [
  "rankings",
  "trends",
  "research",
  "insights",
  "matrix",
  "refs",
  "teams",
  "crews",
] as const;

/** Leagues that ship full hub routes in the App Router. */
export const ROUTED_LEAGUE_IDS = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
] as const satisfies readonly LeagueId[];

export type RoutedLeagueId = (typeof ROUTED_LEAGUE_IDS)[number];

/** Coming-soon leagues linked from dev nav but without ingest pages. */
export const COMING_SOON_LEAGUE_IDS = ["wnba", "mlb"] as const satisfies readonly LeagueId[];

/** Routed college leagues hidden until conference-gated NCAA data is live. */
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
    const hubPrefix = prefix || "";
    redirects.push({
      source: `${hubPrefix}/insights`,
      destination: `${hubPrefix}/rankings`,
    });
    if (leagueId === "nba") {
      redirects.push({ source: "/nba/compare", destination: "/compare" });
    } else {
      redirects.push({ source: `${prefix}/compare`, destination: "/compare" });
    }
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
  ];

  for (const leagueId of ROUTED_LEAGUE_IDS) {
    const prefix = LEAGUES[leagueId].pathPrefix;
    paths.push(prefix || "/nba");
    for (const segment of HUB_SEGMENTS) {
      paths.push(`${prefix}/${segment}`);
    }
  }

  return paths;
}

/** Map a URL path to its App Router page module. */
export function routePathToPageModule(routePath: string): string {
  const normalized = routePath.replace(/\/$/, "") || "/";
  if (normalized === "/") return "src/app/page.tsx";
  const segments = normalized.split("/").filter(Boolean);
  return `src/app/${segments.join("/")}/page.tsx`;
}

/** Nav hrefs from SiteNav that must resolve (page or redirect). */
export function siteNavHrefPaths(): string[] {
  const paths: string[] = [];
  for (const leagueId of LEAGUE_IDS) {
    const prefix = LEAGUES[leagueId].pathPrefix;
    if (leagueId === "nba") {
      paths.push("/nba", "/teams", "/matrix", "/refs", "/rankings", "/compare");
      continue;
    }
    if ((COMING_SOON_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)) {
      paths.push(prefix, `${prefix}/rankings`);
      continue;
    }
    if ((ROUTED_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)) {
      paths.push(prefix, `${prefix}/teams`, `${prefix}/matrix`, `${prefix}/refs`, `${prefix}/rankings`, "/compare");
    }
  }
  return paths;
}
