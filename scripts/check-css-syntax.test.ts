import { execSync } from "node:child_process";
import { describe, it } from "node:test";

describe("check-css-syntax", () => {
  it("parses all src CSS without syntax errors", () => {
    execSync("npx tsx scripts/check-css-syntax.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });
});
