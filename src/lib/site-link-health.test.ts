import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { getAllRefSlugs, getRefBySlug, getRefStats } from "@/lib/data";
import { getAllRefSlugs as getNhlRefSlugs, getRefBySlug as getNhlRefBySlug, getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { getAllRefSlugs as getNflRefSlugs, getRefBySlug as getNflRefBySlug, getRefStats as getNflRefStats } from "@/lib/nfl/data";
import { refProfileHref } from "@/lib/leagues";

describe("site link health", () => {
  it("rankings hub passes league basePath to ref profile links", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/InsightsHubPage.tsx"),
      "utf8",
    );
    assert.match(source, /basePath=\{league\.pathPrefix\}/);
    assert.equal(
      (source.match(/basePath=\{league\.pathPrefix\}/g) ?? []).length,
      2,
      "RankingsInsightCards and RefRankingsTable must both receive basePath",
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
      if (league === "nba") {
        assert.equal(href, `/refs/${sample}`);
      } else {
        assert.equal(href, `/${league}/refs/${sample}`);
        assert.notEqual(href, `/refs/${sample}`, "non-NBA refs must not link to NBA paths");
      }
    }
  });
});
