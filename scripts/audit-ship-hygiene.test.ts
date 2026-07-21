import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");

describe("audit-ship-hygiene", () => {
  it("passes on the current codebase", () => {
    const output = execSync("npx tsx scripts/audit-ship-hygiene.ts", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.match(output, /Ship hygiene audit passed/);
  });

  it("package.json exposes audit:ship-hygiene in check:ci", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    assert.match(pkg, /audit:ship-hygiene/);
    assert.match(pkg, /check:ci[\s\S]*audit:ship-hygiene/);
  });
});
