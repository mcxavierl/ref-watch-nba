import { execSync } from "node:child_process";
import { describe, it } from "node:test";

describe("check-generated-artifact-tests guardrail", () => {
  it("passes on the current test suite", () => {
    execSync("npx tsx scripts/check-generated-artifact-tests.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });
});
