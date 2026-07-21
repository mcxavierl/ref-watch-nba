import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("check-enterprise-api-routes", () => {
  it("passes on current v1 route handlers", () => {
    execSync("npx tsx scripts/check-enterprise-api-routes.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });

  it("check:ci runs typecheck after build:next", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: { "check:ci"?: string };
    };
    const checkCi = pkg.scripts?.["check:ci"] ?? "";
    const buildIndex = checkCi.indexOf("build:next");
    const postBuildTypecheckIndex = checkCi.indexOf("typecheck", buildIndex);
    assert.ok(buildIndex >= 0, "check:ci must run build:next");
    assert.ok(
      postBuildTypecheckIndex > buildIndex,
      "check:ci must run typecheck again after build:next for generated route types",
    );
  });
});
