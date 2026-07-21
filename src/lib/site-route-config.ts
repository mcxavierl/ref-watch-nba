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
    if (leagueId === "nfl") {
      paths.push(`${prefix}/research/game-state`);
    }
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

/** Candidate App Router modules for a URL (includes dynamic [league]/[slug] patterns). */
export function appRouteModuleCandidates(routePath: string): string[] {
  const normalized = routePath.replace(/\/$/, "") || "/";
  if (normalized === "/") return ["src/app/page.tsx"];

  const segments = normalized.split("/").filter(Boolean);
  const candidates = new Set<string>([routePathToPageModule(normalized)]);

  const leagueId = segments[0] as LeagueId;
  if (segments.length >= 1 && LEAGUE_MANIFEST[leagueId]?.routed) {
    const rest = segments.slice(1);
    if (rest.length === 0) {
      candidates.add("src/app/[league]/page.tsx");
    } else if (rest.length === 1) {
      candidates.add(`src/app/[league]/${rest[0]}/page.tsx`);
    } else if (rest.length === 2) {
      if (rest[0] === "refs") candidates.add("src/app/[league]/refs/[slug]/page.tsx");
      else if (rest[0] === "teams") candidates.add("src/app/[league]/teams/[abbr]/page.tsx");
      else if (rest[0] === "research") {
        candidates.add(`src/app/[league]/research/${rest[1]}/page.tsx`);
        candidates.add("src/app/[league]/research/[legacyFindingId]/page.tsx");
      } else {
        candidates.add(`src/app/[league]/${rest.join("/")}/page.tsx`);
      }
    } else if (rest.length === 3 && rest[0] === "research" && rest[1] === "findings") {
      candidates.add("src/app/[league]/research/findings/[id]/page.tsx");
    } else if (rest.length === 3 && rest[0] === "research") {
      candidates.add("src/app/[league]/research/[legacyFindingId]/page.tsx");
    }
  } else if (segments.length >= 2) {
    const prefix = segments.slice(0, -1).join("/");
    candidates.add(`src/app/${prefix}/[slug]/page.tsx`);
    candidates.add(`src/app/${prefix}/[id]/page.tsx`);
    candidates.add(`src/app/${prefix}/[abbr]/page.tsx`);
  }

  return [...candidates];
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
