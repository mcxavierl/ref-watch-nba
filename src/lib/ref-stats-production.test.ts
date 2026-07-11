import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getRefStats as getNbaRefStats } from "@/lib/data";
import { getRefStats as getNflRefStats } from "@/lib/nfl/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { getRefStats as getEplRefStats } from "@/lib/epl/data";
import { getRefStats as getLaligaRefStats } from "@/lib/laliga/data";

function clearLeagueCaches(): void {
  globalThis.__REFWATCH_NBA_REF_STATS__ = undefined;
  globalThis.__REFWATCH_NHL_REF_STATS__ = undefined;
  globalThis.__REFWATCH_NFL_REF_STATS__ = undefined;
  globalThis.__REFWATCH_EPL_REF_STATS__ = undefined;
  globalThis.__REFWATCH_LALIGA_REF_STATS__ = undefined;
}

describe("production getRefStats fallbacks", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    clearLeagueCaches();
  });

  it("returns verified refs from bundled core when CDN cache is cold", () => {
    env.NODE_ENV = "production";
    clearLeagueCaches();

    const leagues = [
      ["nba", getNbaRefStats],
      ["nfl", getNflRefStats],
      ["nhl", getNhlRefStats],
      ["epl", getEplRefStats],
      ["laliga", getLaligaRefStats],
    ] as const;

    for (const [league, getRefStats] of leagues) {
      const stats = getRefStats();
      assert.ok(stats.refs.length > 0, `${league} refs`);
      assert.equal(stats.meta.data_verified, true, `${league} verified`);
    }
  });
});
