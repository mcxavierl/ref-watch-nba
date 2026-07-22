import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("header nav routing", () => {
  it("disables league-hub slate SWR polling to avoid router conflicts", () => {
    const section = readSrc("src/components/LeagueHubUpcomingSlateSection.tsx");
    assert.match(section, /enableSlatePolling=\{false\}/);
  });

  it("keeps homepage live slate polling enabled", () => {
    const section = readSrc("src/components/OverviewUpcomingSlateSection.tsx");
    assert.doesNotMatch(section, /enableSlatePolling=\{false\}/);
  });

  it("does not revalidate live slate on window focus", () => {
    const hook = readSrc("src/lib/use-live-slate.ts");
    assert.match(hook, /revalidateOnFocus:\s*false/);
  });

  it("renders league header links with href targets", () => {
    const nav = readSrc("src/components/SiteNav.tsx");
    assert.match(nav, /href=\{leagueHubHref\(id\)\}/);
    assert.match(nav, /PrefetchLink/);
  });
});
