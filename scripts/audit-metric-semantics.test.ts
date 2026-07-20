import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = join(import.meta.dirname, "..");

describe("audit-metric-semantics", () => {
  it("passes on the current codebase", () => {
    const output = execSync("npx tsx scripts/audit-metric-semantics.ts", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.match(output, /Metric semantics audit passed/);
  });

  it("writes METRIC-SEMANTICS-AUDIT.md report", () => {
    execSync("npx tsx scripts/audit-metric-semantics.ts", { cwd: ROOT });
    const report = readFileSync(join(ROOT, "METRIC-SEMANTICS-AUDIT.md"), "utf8");
    assert.match(report, /Metric semantics audit/);
    assert.match(report, /InsightMetricComparison/);
    assert.match(report, /No metric semantics violations flagged/);
  });

  it("package.json exposes audit:metric-semantics script", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    assert.match(pkg, /audit:metric-semantics/);
  });
});
