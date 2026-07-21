import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { getAllRefSlugs, getRefBySlug, getRefStats } from "@/lib/data";
import { getAllRefSlugs as getNhlRefSlugs, getRefBySlug as getNhlRefBySlug, getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { getAllRefSlugs as getNflRefSlugs, getRefBySlug as getNflRefBySlug, getRefStats as getNflRefStats } from "@/lib/nfl/data";
import { refProfileHref } from "@/lib/leagues";
import {
  appRouteModuleCandidates,
  canonicalSiteRoutePaths,
  routePathToPageModule,
  siteNavHrefPaths,
  siteRouteRedirects,
  type SiteRouteRedirect,
} from "@/lib/site-route-config";

function pageModuleExists(routePath: string, root = process.cwd()): boolean {
  return appRouteModuleCandidates(routePath).some((rel) => existsSync(join(root, rel)));
}

function resolveNavHref(href: string, redirects: SiteRouteRedirect[]): string | null {
  const normalized = href.replace(/\/$/, "") || "/";
  if (pageModuleExists(normalized)) return normalized;

  for (const rule of redirects) {
    if (rule.source === normalized) return rule.destination;
    const wildcard = rule.source.endsWith("/:path*");
    if (wildcard) {
      const base = rule.source.replace("/:path*", "");
      if (normalized === base || normalized.startsWith(`${base}/`)) {
        return rule.destination;
      }
    }
  }
  return null;
}

describe("site link health", () => {
  it("rankings hub passes league basePath to ref profile links", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/InsightsHubPage.tsx"),
      "utf8",
    );
    assert.match(
      source,
      /<RankingsInsightCards[\s\S]*?basePath=\{league\.pathPrefix\}/,
      "RankingsInsightCards must receive basePath",
    );
    assert.match(
      source,
      /<RefRankingsTable[\s\S]*?basePath=\{league\.pathPrefix\}/,
      "RefRankingsTable must receive basePath",
    );
  });

  it("league ref and team routes resolve to dynamic App Router modules", () => {
    assert.ok(pageModuleExists("/nba/refs/jacyn-goble-68"));
    assert.ok(pageModuleExists("/nba/teams/ATL"));
    assert.ok(pageModuleExists("/nhl/research/nhl-whistle-outlier"));
    assert.ok(pageModuleExists("/nba/research/findings/league-over-skew"));
    assert.ok(
      appRouteModuleCandidates("/nba/refs/jacyn-goble-68").includes(
        "src/app/[league]/refs/[slug]/page.tsx",
      ),
    );
  });

  it("below-gate refs resolve in data and use league-prefixed profile hrefs", () => {
    const cases = [
      {
        league: "nba" as const,
        getStats: getRefStats,
        getSlugs: getAllRefSlugs,
        getBySlug: getRefBySlug,
      },
      {
        league: "nhl" as const,
        getStats: getNhlRefStats,
        getSlugs: getNhlRefSlugs,
        getBySlug: getNhlRefBySlug,
      },
      {
        league: "nfl" as const,
        getStats: getNflRefStats,
        getSlugs: getNflRefSlugs,
        getBySlug: getNflRefBySlug,
      },
    ];

    for (const { league, getStats, getSlugs, getBySlug } of cases) {
      const min = getStats().meta.minSampleSize;
      const below = getSlugs().filter((slug) => {
        const ref = getBySlug(slug);
        return ref && ref.games < min;
      });
      assert.ok(below.length > 0, `${league} should have below-gate refs in data`);

      const sample = below[0]!;
      const href = refProfileHref(league, sample);
      assert.equal(href, `/${league}/refs/${sample}`);
      if (league !== "nba") {
        assert.notEqual(href, `/refs/${sample}`, "non-NBA refs must not link to legacy NBA root paths");
      }
    }
  });

  it("canonical hub routes have App Router pages", () => {
    const missing: string[] = [];
    for (const path of canonicalSiteRoutePaths()) {
      if (!pageModuleExists(path)) {
        missing.push(`${path} → ${join("src/app", path === "/" ? "page.tsx" : `${path.slice(1)}/page.tsx`)}`);
      }
    }
    assert.deepEqual(missing, [], `missing page modules:\n${missing.join("\n")}`);
  });

  it("site nav hrefs resolve to a page or redirect", () => {
    const redirects = siteRouteRedirects();
    const unresolved: string[] = [];
    for (const href of siteNavHrefPaths()) {
      if (!resolveNavHref(href, redirects)) unresolved.push(href);
    }
    assert.deepEqual(unresolved, [], `unresolved nav hrefs:\n${unresolved.join("\n")}`);
  });

  it("league compare aliases redirect to global compare", () => {
    const redirects = siteRouteRedirects();
    assert.equal(resolveNavHref("/compare", redirects), "/compare");
    for (const source of [
      "/nba/compare",
      "/nhl/compare",
      "/nfl/compare",
      "/epl/compare",
      "/laliga/compare",
      "/cbb/compare",
    ]) {
      assert.equal(resolveNavHref(source, redirects), "/compare", `${source} should alias to /compare`);
    }
    for (const source of ["/cfb/compare"]) {
      assert.equal(resolveNavHref(source, redirects), "/compare", `${source} should alias to /compare`);
    }
  });

  it("legacy crews routes redirect to refs hubs", () => {
    const redirects = siteRouteRedirects();
    const cases = [
      ["/nhl/crews", "/nhl/refs"],
      ["/nfl/crews", "/nfl/refs"],
      ["/cbb/crews", "/cbb/refs"],
    ] as const;
    for (const [source, destination] of cases) {
      assert.equal(resolveNavHref(source, redirects), destination, `${source} should redirect`);
    }
  });
});
