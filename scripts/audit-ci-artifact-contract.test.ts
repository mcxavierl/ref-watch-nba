import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { COUPLED_TEST_RULES } from "./check-coupled-test-changes";

const ROOT = join(import.meta.dirname, "..");

describe("audit-ci-artifact-contract", () => {
  it("passes on the current codebase", () => {
    execSync("git restore data/overview-snapshot.json 2>/dev/null || true", {
      cwd: ROOT,
      stdio: "ignore",
    });
    const output = execSync("npx tsx scripts/audit-ci-artifact-contract.ts", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.match(output, /CI artifact contract audit passed/);
  });

  it("writes CI-ARTIFACT-CONTRACT-AUDIT.md with workflow matrix", () => {
    execSync("git restore data/overview-snapshot.json 2>/dev/null || true", {
      cwd: ROOT,
      stdio: "ignore",
    });
    execSync("npx tsx scripts/audit-ci-artifact-contract.ts", { cwd: ROOT });
    const report = readFileSync(join(ROOT, "CI-ARTIFACT-CONTRACT-AUDIT.md"), "utf8");
    assert.match(report, /CI and artifact contract audit/);
    assert.match(report, /Workflow matrix/);
    assert.match(report, /Nightly slate refresh/);
    assert.match(report, /Nightly slate refresh \| yes \| write \| yes/);
  });

  it("exports coupled test rules for contract auditing", () => {
    assert.ok(COUPLED_TEST_RULES.length >= 3);
    for (const rule of COUPLED_TEST_RULES) {
      assert.ok(rule.label.length > 0);
      assert.ok(rule.sources.length > 0);
      assert.ok(rule.tests.length > 0);
    }
  });

  it("package.json exposes audit:ci-artifact-contract script", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    assert.match(pkg, /audit:ci-artifact-contract/);
  });
});
