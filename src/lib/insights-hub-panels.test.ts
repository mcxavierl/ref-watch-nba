import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("insights hub panels", () => {
  const source = readFileSync("src/components/InsightsHubPage.tsx", "utf8");

  it("keeps tendencies and trends panel bodies distinct", () => {
    const trendsStart = source.indexOf('if (activeView === "trends")');
    const trendsEnd = source.indexOf("let gameStatePanel");
    assert.ok(trendsStart >= 0 && trendsEnd > trendsStart);
    const trendsPanelBlock = source.slice(trendsStart, trendsEnd);

    assert.match(trendsPanelBlock, /LeagueTrendsTable/);
    assert.doesNotMatch(trendsPanelBlock, /rankingsHook/);
    assert.match(source, /tendenciesPanel[\s\S]*rankingsHook/);
    assert.match(source, /activeView === "tendencies"/);
  });
});
