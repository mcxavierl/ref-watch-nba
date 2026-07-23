import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("OfficiatingFingerprint chart labels", () => {
  it("uses padded viewBox and short axis labels to avoid clipping", () => {
    const source = readFileSync("src/components/visuals/OfficiatingFingerprint.tsx", "utf8");
    const css = readFileSync("src/components/visuals/officiating-fingerprint.css", "utf8");

    assert.match(source, /LABEL_PADDING/);
    assert.match(source, /axis\.shortLabel/);
    assert.doesNotMatch(source, /compact \? axis\.shortLabel : axis\.label/);
    assert.match(source, /labelPlacement/);
    assert.match(source, /officiating-fingerprint-vertex-hit/);
    assert.match(source, /onClick=\{\(\) =>/);
    assert.match(source, /coarsePointerUi/);
    assert.match(source, /consumerFacing/);
    assert.match(css, /overflow:\s*visible/);
  });
});
