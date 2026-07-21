import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDashboardHeroHighlights,
  DASHBOARD_HERO_HIGHLIGHTS,
} from "@/lib/dashboard-hero-highlights";

describe("dashboard hero highlights", () => {
  it("builds highlights from rankings synthesis instead of static copy", () => {
    const highlights = buildDashboardHeroHighlights();
    assert.ok(highlights.length > 0);
    for (const highlight of highlights) {
      assert.ok(highlight.official.length > 0);
      assert.ok(highlight.parts.length > 0);
      assert.ok(highlight.href?.includes(`/${highlight.leagueId}/refs/`));
    }
  });

  it("exports prebuilt hero highlights for the dashboard strip", () => {
    assert.ok(DASHBOARD_HERO_HIGHLIGHTS.length > 0);
  });
});
