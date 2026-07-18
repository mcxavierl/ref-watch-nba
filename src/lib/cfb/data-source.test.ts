import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cfbOfficialsPendingMessage,
  cfbPreviewBannerMessage,
  isCfbOfficialsPending,
} from "@/lib/cfb/data-source";
import type { RefStatsFile } from "@/lib/types";

describe("cfb data-source officials pending", () => {
  const pendingStats: Pick<RefStatsFile, "meta" | "refs"> = {
    meta: {
      source: "espn",
      totalGamesProcessed: 1426,
      refCount: 0,
    } as RefStatsFile["meta"],
    refs: [],
  };

  it("detects ESPN game logs without official profiles", () => {
    assert.equal(isCfbOfficialsPending(pendingStats), true);
  });

  it("surfaces an officials-pending banner message", () => {
    assert.match(cfbOfficialsPendingMessage(pendingStats.meta), /official crews are not published/i);
    assert.match(
      cfbPreviewBannerMessage("espn", "espn", pendingStats),
      /ref profiles and ref×team matrix stay unavailable/i,
    );
  });
});
