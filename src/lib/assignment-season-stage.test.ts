import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSeasonStageNote,
  formatSeasonStageNote,
  resolveAssignmentSeasonStage,
  seasonStageFromEspnSeason,
} from "@/lib/assignment-season-stage";

describe("assignment-season-stage", () => {
  it("formats plain-language notes", () => {
    assert.equal(formatSeasonStageNote("preseason"), "Pre-season game");
    assert.equal(formatSeasonStageNote("exhibition"), "Exhibition match");
  });

  it("uses explicit seasonStage when present", () => {
    assert.equal(
      resolveAssignmentSeasonStage("nfl", { seasonStage: "exhibition" }, "2026-08-06"),
      "exhibition",
    );
  });

  it("infers NFL pre-season from August slate dates", () => {
    assert.equal(
      resolveAssignmentSeasonStage("nfl", {}, "2026-08-06"),
      "preseason",
    );
    assert.equal(
      resolveAssignmentSeasonStage("nfl", {}, "2026-09-14"),
      undefined,
    );
  });

  it("builds slate notes only for pre-season or exhibition", () => {
    assert.equal(
      buildSeasonStageNote("nfl", {}, "2026-08-06"),
      "Pre-season game",
    );
    assert.equal(buildSeasonStageNote("nfl", {}, "2026-09-14"), undefined);
  });

  it("maps ESPN pre-season season metadata", () => {
    assert.equal(
      seasonStageFromEspnSeason({ type: 1, slug: "preseason" }),
      "preseason",
    );
    assert.equal(
      seasonStageFromEspnSeason({ slug: "2026-club-friendly" }),
      "exhibition",
    );
  });
});
