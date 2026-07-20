import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = join(import.meta.dirname, "..");

describe("audit-insight-first", () => {
  it("passes on the current codebase", () => {
    const output = execSync("npx tsx scripts/audit-insight-first.ts", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.match(output, /Insight-first audit passed/);
  });

  it("package.json exposes audit:insight-first script", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    assert.match(pkg, /audit:insight-first/);
    assert.match(pkg, /check:ci[\s\S]*audit:insight-first/);
  });
});
