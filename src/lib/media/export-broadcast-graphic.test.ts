import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  broadcastGraphicFilename,
  ensureBroadcastExportFontsLoaded,
} from "@/lib/media/export-broadcast-graphic";
import {
  MEDIA_CARD_HEIGHT,
  MEDIA_CARD_WIDTH,
} from "@/lib/media/media-card-types";

describe("export broadcast graphic", () => {
  it("uses 1920x1080 export dimensions", () => {
    assert.equal(MEDIA_CARD_WIDTH, 1920);
    assert.equal(MEDIA_CARD_HEIGHT, 1080);
  });

  it("builds sanitized broadcast filenames", () => {
    assert.equal(
      broadcastGraphicFilename("LAL @ BOS"),
      "ref-watch-lal-bos.png",
    );
    assert.equal(
      broadcastGraphicFilename("  "),
      "ref-watch-broadcast.png",
    );
  });

  it("exposes font preload helper for html-to-image exports", async () => {
    await assert.doesNotReject(async () => ensureBroadcastExportFontsLoaded());
  });
});
