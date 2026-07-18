import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  isOverviewSnapshotSource,
  OVERVIEW_SNAPSHOT_SOURCES,
} from "./overview-snapshot-sources";

describe("ship guardrail scripts", () => {
  it("check-coupled-test-changes passes on current branch", () => {
    execSync("npx tsx scripts/check-coupled-test-changes.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });

  it("tracks homepage insight gate files as overview snapshot sources", () => {
    const required = [
      "src/lib/homepage-insight-gates.ts",
      "src/config/methodology.ts",
      "src/lib/insight-editorial.ts",
      "src/lib/insights/insights-query.ts",
    ];
    for (const file of required) {
      if (!OVERVIEW_SNAPSHOT_SOURCES.includes(file as (typeof OVERVIEW_SNAPSHOT_SOURCES)[number])) {
        throw new Error(`missing overview snapshot source: ${file}`);
      }
      if (!isOverviewSnapshotSource(file)) {
        throw new Error(`isOverviewSnapshotSource should match ${file}`);
      }
    }
  });

  it("pre-push hook runs css-syntax before full check:ci", () => {
    const hook = readFileSync(".githooks/pre-push", "utf8");
    const cssIndex = hook.indexOf("check:css-syntax");
    const ciIndex = hook.indexOf("check:ci");
    if (cssIndex < 0 || ciIndex < 0 || cssIndex > ciIndex) {
      throw new Error("pre-push hook must run check:css-syntax before check:ci");
    }
  });

  it("validate workflows allow 20 minutes for build steps", () => {
    for (const file of [".github/workflows/ci.yml", ".github/workflows/deploy.yml"]) {
      const source = readFileSync(file, "utf8");
      if (!source.includes("timeout-minutes: 20")) {
        throw new Error(`${file} must set validate timeout-minutes: 20`);
      }
    }
  });
});
