import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dataQualityFromSampleSize,
  meetsSampleSizeThreshold,
  SAMPLE_SIZE_THRESHOLD,
} from "@/lib/analytics/sample-size";

describe("sample-size", () => {
  it("requires 15 games for professional metrics", () => {
    assert.equal(SAMPLE_SIZE_THRESHOLD, 15);
    assert.equal(meetsSampleSizeThreshold(14), false);
    assert.equal(meetsSampleSizeThreshold(15), true);
    assert.equal(dataQualityFromSampleSize(10), "insufficient");
    assert.equal(dataQualityFromSampleSize(20), "ok");
  });
});
