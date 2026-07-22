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

  it("disables league-hub score polling on static slate cards", () => {
    const grid = readSrc("src/components/LiveSlateGrid.tsx");
    assert.match(grid, /disableScorePolling=\{!enableSlatePolling\}/);
  });

  it("keeps homepage live slate polling enabled", () => {
    const section = readSrc("src/components/OverviewUpcomingSlateSection.tsx");
    assert.doesNotMatch(section, /enableSlatePolling=\{false\}/);
    assert.doesNotMatch(section, /overview-slate-offseason/);
    assert.match(section, /LiveSlateGrid/);
  });

  it("does not revalidate live slate on window focus", () => {
    const hook = readSrc("src/lib/use-live-slate.ts");
    assert.match(hook, /revalidateOnFocus:\s*false/);
  });

  it("uses full-page header links instead of client router prefetch", () => {
    const nav = readSrc("src/components/SiteNav.tsx");
    const sectionNav = readSrc("src/components/LeagueSectionNav.tsx");
    const header = readSrc("src/components/SiteHeader.tsx");

    assert.match(nav, /HeaderNavLink/);
    assert.match(nav, /href=\{leagueHubHref\(id\)\}/);
    assert.doesNotMatch(nav, /PrefetchLink/);

    assert.match(sectionNav, /HeaderNavLink/);
    assert.doesNotMatch(sectionNav, /PrefetchLink/);

    assert.match(header, /HeaderNavLink/);
    assert.doesNotMatch(header, /from "next\/link"/);
  });

  it("loads homepage slate from live engine and reflects loaded matchup count", () => {
    const page = readSrc("src/app/page.tsx");
    const hero = readSrc("src/components/OverviewIntelligenceHero.tsx");
    const grid = readSrc("src/components/LiveSlateGrid.tsx");
    const outlook = readSrc("src/components/TodaysOfficiatingOutlookBanner.tsx");

    assert.match(page, /getLiveSlateGames/);
    assert.match(page, /preloadAssignmentsForLiveSlate/);
    assert.doesNotMatch(hero, /DailyBriefingBanner/);
    assert.match(outlook, /buildSlateOutlookSummary/);
    assert.match(grid, /TodaysOfficiatingOutlookBanner/);
    assert.match(grid, /displayGames\.length/);
  });
});
