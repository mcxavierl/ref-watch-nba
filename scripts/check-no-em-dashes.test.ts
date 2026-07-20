import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = join(import.meta.dirname, "..");

describe("check-no-em-dashes", () => {
  it("passes on the current codebase", () => {
    const output = execSync("npx tsx scripts/check-no-em-dashes.ts", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.match(output, /check-no-em-dashes: OK/);
  });

  it("package.json exposes check:no-em-dashes in check:ci", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    assert.match(pkg, /check:no-em-dashes/);
    assert.match(pkg, /check:ci[\s\S]*check:no-em-dashes/);
  });
});
