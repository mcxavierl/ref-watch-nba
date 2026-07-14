import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gameTouchesCfbConference,
  getCfbTeamAbbrsForConference,
  normalizeConferenceSlug,
  resolveCfbConferencesToProcess,
  shouldIngestCfbGame,
} from "./leagues-config";

describe("cfb leagues config", () => {
  it("normalizes conference slugs", () => {
    assert.equal(normalizeConferenceSlug("Big_12"), "big-12");
  });

  it("resolves ingest-enabled conferences by default", () => {
    const conferences = resolveCfbConferencesToProcess();
    assert.deepEqual(
      conferences.map((conf) => conf.slug),
      ["acc", "sec", "big-ten"],
    );
  });

  it("resolves a single conference for debugging", () => {
    const conferences = resolveCfbConferencesToProcess("big-12");
    assert.equal(conferences.length, 1);
    assert.equal(conferences[0]?.slug, "big-12");
    assert.equal(getCfbTeamAbbrsForConference("Big 12").length, 4);
  });

  it("gates games by configured conference membership", () => {
    assert.equal(shouldIngestCfbGame("ALA", "UGA"), true);
    assert.equal(shouldIngestCfbGame("UTAH", "TCU"), false);
    assert.equal(shouldIngestCfbGame("UTAH", "TCU", "big-12"), true);
    assert.equal(gameTouchesCfbConference("ALA", "UGA", "SEC"), true);
  });
});
