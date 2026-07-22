import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { describe, it } from "node:test";

describe("check-hero-theme-tokens", () => {
  it("passes on current homepage hero styles", () => {
    execSync("npx tsx scripts/check-hero-theme-tokens.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });

  it("preflight includes client imports and design guardrail tests", () => {
    const preflight = execSync("cat scripts/check-preflight.ts", { encoding: "utf8" });
    assert.match(preflight, /check:client-imports/);
    assert.match(preflight, /check:coupled-tests/);
    assert.match(preflight, /check-hero-theme-tokens/);
    assert.match(preflight, /design-audit\.test\.ts/);
    assert.match(preflight, /clinical-modern-surfaces\.test\.ts/);
  });
});
