import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getRefStats as getNbaRefStats } from "@/lib/data";
import { getRefStats as getNflRefStats } from "@/lib/nfl/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { getRefStats as getEplRefStats } from "@/lib/epl/data";
import { getRefStats as getLaligaRefStats } from "@/lib/laliga/data";
import { getRefStats as getCbbRefStats } from "@/lib/cbb/data";

import {
  beginWorkerIsolateRequest,
  endWorkerIsolateRequest,
} from "@/lib/worker-isolate-store";

function clearLeagueCaches(): void {
  endWorkerIsolateRequest();
  beginWorkerIsolateRequest();
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
      ["cbb", getCbbRefStats],
    ] as const;

    for (const [league, getRefStats] of leagues) {
      const stats = getRefStats();
      assert.ok(stats.refs.length > 0, `${league} refs`);
      assert.equal(stats.meta.data_verified, true, `${league} verified`);
    }
  });
});
