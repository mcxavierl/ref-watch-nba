import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterNhlReferees,
  isNhlLinesman,
  isNhlReferee,
} from "@/lib/nhl/officials";
import type { RefProfile } from "@/lib/types";

function profile(
  overrides: Partial<RefProfile> & Pick<RefProfile, "slug" | "name">,
): RefProfile {
  return {
    number: 1,
    games: 50,
    avgTotalPoints: 6,
    overRate: 0.5,
    avgFouls: 12,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024-25"],
    recentGames: [],
    ...overrides,
  };
}

describe("nhl officials", () => {
  it("uses explicit role when present", () => {
    assert.equal(isNhlReferee(profile({ slug: "a", name: "A", role: "referee" })), true);
    assert.equal(isNhlLinesman(profile({ slug: "b", name: "B", role: "linesman" })), true);
  });

  it("falls back to nhlAnalytics when role is missing", () => {
    assert.equal(
      isNhlReferee(
        profile({
          slug: "c",
          name: "C",
          nhlAnalytics: {
            avgMinorsPerGame: 7,
            minorsDelta: 0,
            overtimeRate: 0.2,
            overtimeGames: 10,
            avgMinorImbalance: 1,
            balancedGameRate: 0.5,
            balanceKind: "neutral",
          },
        }),
      ),
      true,
    );
    assert.equal(isNhlLinesman(profile({ slug: "d", name: "D" })), true);
  });

  it("filterNhlReferees keeps only referees", () => {
    const refs = [
      profile({ slug: "ref", name: "Ref", role: "referee" }),
      profile({ slug: "lin", name: "Lin", role: "linesman" }),
    ];
    assert.deepEqual(filterNhlReferees(refs).map((ref) => ref.slug), ["ref"]);
  });
});
