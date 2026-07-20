import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("design ship audit", () => {
  it("bundles theme matrix, color drift, and brand surfaces", () => {
    const source = readFileSync("scripts/audit-design-ship.ts", "utf8");
    assert.match(source, /audit:theme-matrix/);
    assert.match(source, /audit:color-drift/);
    assert.match(source, /audit:brand-surfaces/);
  });

  it("CI workflow runs design ship audit after Playwright install", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const playwrightIndex = ci.indexOf("Install Playwright Chromium");
    const designShipIndex = ci.indexOf("Design ship audit");
    assert.ok(playwrightIndex >= 0, "CI must install Playwright");
    assert.ok(designShipIndex > playwrightIndex, "Design ship must run after Playwright install");
    assert.match(ci, /npm run audit:design-ship/);
  });
});
