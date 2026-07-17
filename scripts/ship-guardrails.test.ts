import { execSync } from "node:child_process";
import { describe, it } from "node:test";

describe("ship guardrail scripts", () => {
  it("check-artifact-freshness passes on current snapshot", () => {
    execSync("npx tsx scripts/check-artifact-freshness.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });

  it("check-coupled-test-changes passes on current branch", () => {
    execSync("npx tsx scripts/check-coupled-test-changes.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });
});
