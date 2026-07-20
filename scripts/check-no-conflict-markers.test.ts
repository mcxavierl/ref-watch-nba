import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = join(import.meta.dirname, "..");

describe("check-no-conflict-markers", () => {
  it("passes on the current codebase", () => {
    const output = execSync("npx tsx scripts/check-no-conflict-markers.ts", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.match(output, /check-no-conflict-markers: OK/);
  });

  it("package.json exposes check:no-conflict-markers in check:ci before typecheck", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    assert.match(pkg, /check:no-conflict-markers/);
    const ci = pkg.match(/"check:ci": "([^"]+)"/)?.[1] ?? "";
    const conflictIndex = ci.indexOf("check:no-conflict-markers");
    const typecheckIndex = ci.indexOf("typecheck");
    assert.ok(conflictIndex >= 0, "check:ci must include check:no-conflict-markers");
    assert.ok(
      conflictIndex < typecheckIndex,
      "check:no-conflict-markers must run before typecheck",
    );
  });
});
