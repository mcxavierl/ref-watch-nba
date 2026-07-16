import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RefProfile } from "../../src/lib/types";
import {
  auditRefIdentity,
  auditRefStatsRefs,
  findDuplicateCanonicalKeys,
} from "./audit-ref-identity";
import { canonicalRefKey } from "./ref-identity";

function ref(
  name: string,
  slug: string,
  number: number,
  games: number,
): RefProfile {
  return {
    name,
    slug,
    number,
    games,
    avgTotalPoints: 200,
    overRate: 0.5,
    avgFouls: 20,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024-25"],
    recentGames: [],
  };
}

describe("audit-ref-identity", () => {
  it("findDuplicateCanonicalKeys groups alias variants", () => {
    const refs = [
      ref("John Goble", "john-goble-10", 10, 100),
      ref("Jacyn Goble", "jacyn-goble-10", 10, 200),
    ];
    const dups = findDuplicateCanonicalKeys(refs);
    assert.equal(dups.length, 1);
    assert.equal(dups[0].canonicalKey, canonicalRefKey("Jacyn Goble"));
    assert.equal(dups[0].profiles.length, 2);
  });

  it("findDuplicateCanonicalKeys ignores distinct officials with same initial", () => {
    const refs = [
      ref("Jerry Bergman", "jerry-bergman-0", 0, 84),
      ref("Jeff Bergman", "jeff-bergman-0", 0, 74),
    ];
    assert.equal(findDuplicateCanonicalKeys(refs).length, 0);
  });

  it("auditRefStatsRefs detects reverse-name ghosts", () => {
    const refs = [
      ref("Smith John", "smith-john-0", 0, 12),
      ref("John Smith", "john-smith-42", 42, 300),
    ];
    const findings = auditRefStatsRefs("test", refs);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].type, "reverse-name-ghost");
  });

  it("passes on current committed ref-stats data", () => {
    const { failures } = auditRefIdentity();
    assert.equal(
      failures.length,
      0,
      failures.join("\n"),
    );
  });
});
