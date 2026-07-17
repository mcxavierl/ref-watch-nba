import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBaselinePct, formatBaselineAtsPct, formatTeamWhistleEdgeLabel } from "@/lib/stats-utils";

describe("formatBaselinePct", () => {
  it('returns "n/a" when baseline games are zero', () => {
    assert.equal(formatBaselinePct(0, 0), "n/a");
    assert.equal(formatBaselinePct(0, 0.5), "n/a");
  });

  it("formats win rate when baseline games exist", () => {
    assert.equal(formatBaselinePct(10, 0.5), "50.0%");
    assert.equal(formatBaselinePct(1, 0), "0.0%");
  });

  it("formats ATS cover rate when lined games exist", () => {
    assert.equal(formatBaselineAtsPct(0, 0.5), "n/a");
    assert.equal(formatBaselineAtsPct(12, 0.583), "58.3%");
  });
});

describe("formatTeamWhistleEdgeLabel", () => {
  it("describes fewer whistles on the team when edge is positive", () => {
    assert.equal(
      formatTeamWhistleEdgeLabel(2.3, "Ravens", "flags"),
      "2.3 fewer flags on Ravens",
    );
  });

  it("describes more whistles on the team when edge is negative", () => {
    assert.equal(
      formatTeamWhistleEdgeLabel(-1.5, "Ravens", "flags"),
      "1.5 more flags on Ravens",
    );
  });

  it("reads even when edge is near zero", () => {
    assert.equal(
      formatTeamWhistleEdgeLabel(0, "Ravens", "flags"),
      "Even flags on Ravens",
    );
  });

  it("omits team name in compact mode", () => {
    assert.equal(
      formatTeamWhistleEdgeLabel(2.3, "Ravens", "flags", { compact: true }),
      "2.3 fewer flags",
    );
    assert.equal(
      formatTeamWhistleEdgeLabel(0, "Ravens", "flags", { compact: true }),
      "Even flags",
    );
  });
});
