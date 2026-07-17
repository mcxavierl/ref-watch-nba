import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { overviewQuickListsForLeague } from "@/lib/league-quick-lists";

describe("overviewQuickListsForLeague", () => {
  it("uses live home cover delta on the CBB home bias card", () => {
    const lists = overviewQuickListsForLeague("cbb", {
      leagueCard: {
        leagueId: "cbb",
        label: "NCAA Basketball",
        shortLabel: "CBB",
        href: "/cbb",
        refCount: 515,
        gameCount: 9701,
        seasonCount: 6,
        whistlePerGame: 34.9,
        whistleLabel: "Fouls per game",
        scorePerGame: 152.9,
        scoreLabel: "Points per game",
        whistleBar: 0.78,
        scoreBar: 0.85,
        analyticsUnlocked: true,
        homeBiasCoverDelta: "-0.7%",
      },
    });
    const homeBias = lists.find((list) => list.id === "home-bias");
    assert.ok(homeBias);
    assert.equal(homeBias.preview.value, "-0.7%");
    assert.equal(homeBias.preview.caption, "Cover Δ");
  });
});
