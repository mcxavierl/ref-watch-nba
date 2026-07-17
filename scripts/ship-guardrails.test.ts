import { execSync } from "node:child_process";
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
});
