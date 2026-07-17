import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = join(process.cwd(), "src");

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, acc);
    } else if (entry.endsWith(".tsx")) {
      acc.push(path);
    }
  }
  return acc;
}

describe("layout shift guards", () => {
  it("does not use empty Suspense fallbacks in app/components", () => {
    const offenders = walk(ROOT).filter((file) =>
      readFileSync(file, "utf8").includes("fallback={null}"),
    );
    assert.deepEqual(
      offenders,
      [],
      `Replace fallback={null} with LayoutShiftSkeletons: ${offenders.join(", ")}`,
    );
  });

  it("homepage avoids dynamic imports with null loading placeholders", () => {
    const dashboard = readFileSync("src/components/OverviewDashboard.tsx", "utf8");
    const home = readFileSync("src/app/page.tsx", "utf8");
    assert.doesNotMatch(dashboard, /loading:\s*\(\)\s*=>\s*null/);
    assert.doesNotMatch(home, /loading:\s*\(\)\s*=>\s*null/);
  });

  it("TeamLogo and RefAvatar set intrinsic image dimensions", () => {
    const teamLogo = readFileSync("src/components/TeamLogo.tsx", "utf8");
    const refAvatar = readFileSync("src/components/RefAvatar.tsx", "utf8");
    assert.match(teamLogo, /width=\{sizePixels\[size\]\}/);
    assert.match(refAvatar, /width=\{sizePixels\[size\]\}/);
    assert.doesNotMatch(refAvatar, /if \(sport === "cbb" \|\| sport === "cfb"\) return null/);
  });
});
