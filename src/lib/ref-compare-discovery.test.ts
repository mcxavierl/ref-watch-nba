import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import {
  buildCrewCompareHref,
  compareSupportsLeague,
  encodeCompareRef,
} from "@/lib/ref-compare";
import {
  buildRefProfileDiscovery,
  findPairedCrewMembersFromLogs,
} from "@/lib/ref-profile-discovery";
import { getRefBySlug } from "@/lib/data";
import { refSlug } from "@/lib/ref-slug";
import { slugLegacyRedirects } from "@/lib/unified-ia-redirects";
import type { RefProfile } from "@/lib/types";

function official(name: string, number: number) {
  return { name, number, role: "referee" as const };
}

function game(overrides: Partial<RuntimeGameLogEntry> = {}): RuntimeGameLogEntry {
  return {
    gameId: overrides.gameId ?? "g1",
    date: overrides.date ?? "2026-01-10",
    season: overrides.season ?? "2025-26",
    league: "NBA",
    homeTeam: overrides.homeTeam ?? "BOS",
    awayTeam: overrides.awayTeam ?? "NYK",
    homeScore: overrides.homeScore ?? 110,
    awayScore: overrides.awayScore ?? 102,
    totalPoints: overrides.totalPoints ?? 212,
    totalFouls: overrides.totalFouls ?? 44,
    closingTotal: 220,
    homeSpread: -4,
    lineSource: "synthetic",
    officials: overrides.officials ?? [
      official("Scott Foster", 48),
      official("Marc Davis", 8),
      official("Tony Brothers", 25),
    ],
    ...overrides,
  };
}

describe("buildCrewCompareHref", () => {
  it("preloads the first two assigned officials for compare-supported leagues", () => {
    const href = buildCrewCompareHref("nba", [
      { name: "Scott Foster", number: 48 },
      { name: "Marc Davis", number: 8 },
      { name: "Tony Brothers", number: 25 },
    ]);
    assert.ok(href);
    assert.match(href!, /^\/compare\?/);
    assert.match(href!, /a=nba%3Ascott-foster-48/);
    assert.match(href!, /b=nba%3Amarc-davis-8/);
    assert.doesNotMatch(href!, /tony-brothers/);
    assert.equal(
      href,
      `/compare?a=${encodeURIComponent(encodeCompareRef("nba", "scott-foster-48"))}&b=${encodeURIComponent(encodeCompareRef("nba", "marc-davis-8"))}`,
    );
  });

  it("returns null when the league or crew is unsupported", () => {
    assert.equal(
      buildCrewCompareHref("cbb", [
        { name: "Scott Foster", number: 48 },
        { name: "Marc Davis", number: 8 },
      ]),
      null,
    );
    assert.equal(
      buildCrewCompareHref("nba", [{ name: "Scott Foster", number: 48 }]),
      null,
    );
    assert.equal(compareSupportsLeague("wnba"), false);
  });
});

describe("ref profile discovery helpers", () => {
  it("finds frequently paired crew members from game logs", () => {
    const targetSlug = refSlug("Scott Foster", 48);
    const paired = findPairedCrewMembersFromLogs("nba", targetSlug, [
      game({ gameId: "g1" }),
      game({ gameId: "g2", date: "2026-01-12" }),
    ]);

    assert.equal(paired.length, 2);
    assert.equal(paired[0]?.sharedGames, 2);
    assert.ok(paired.every((entry) => entry.href.includes("/nba/refs/")));
  });

  it("returns similar whistle profiles when ref stats are available", () => {
    const profile = getRefBySlug("scott-foster");
    if (!profile) {
      const fallback: RefProfile = {
        slug: "scott-foster",
        name: "Scott Foster",
        number: 48,
        games: 100,
        avgTotalPoints: 225,
        overRate: 0.52,
        avgFouls: 42,
        homeCoverRate: null,
        totalPointsDelta: 1.5,
        foulsDelta: 1.2,
        seasons: ["2024-25"],
        recentGames: [],
      };
      const discovery = buildRefProfileDiscovery("nba", fallback);
      assert.equal(discovery.similarProfiles.length, 3);
      return;
    }

    const discovery = buildRefProfileDiscovery("nba", profile);
    assert.equal(discovery.similarProfiles.length, 3);
    assert.ok(
      discovery.similarProfiles.every(
        (entry) => entry.slug !== profile.slug && entry.href.includes("/nba/refs/"),
      ),
    );
  });
});

describe("slugLegacyRedirects", () => {
  it("maps legacy ref slug segments to /refs/", () => {
    const redirects = slugLegacyRedirects();
    assert.ok(
      redirects.some(
        (entry) =>
          entry.source === "/ref/:slug" &&
          entry.destination === "/nba/refs/:slug",
      ),
    );
    assert.ok(
      redirects.some(
        (entry) =>
          entry.source === "/nhl/official/:slug" &&
          entry.destination === "/nhl/refs/:slug",
      ),
    );
  });
});
