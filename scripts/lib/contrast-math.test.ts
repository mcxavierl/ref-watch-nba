import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastRatio, parseCssColor } from "./contrast-math";

describe("contrast-math", () => {
  it("parses modern rgb() strings", () => {
    const rgb = parseCssColor("rgb(24 24 31)");
    assert.ok(rgb);
    assert.equal(rgb.r, 24);
    assert.equal(rgb.g, 24);
    assert.equal(rgb.b, 31);
  });

  it("parses oklab() strings from Tailwind v4 computed styles", () => {
    const oklab = parseCssColor("oklab(0.129 -0.0038832 -0.0418201 / 0.8)");
    assert.ok(oklab);
    assert.ok(oklab.r >= 0 && oklab.r <= 255);
    assert.ok(oklab.g >= 0 && oklab.g <= 255);
    assert.ok(oklab.b >= 0 && oklab.b <= 255);
    assert.equal(oklab.a, 0.8);
  });

  it("computes contrast when foreground and background parse", () => {
    const foreground = parseCssColor("rgb(255 255 255)");
    const background = parseCssColor("oklab(0.129 -0.0038832 -0.0418201 / 0.8)");
    assert.ok(foreground && background);
    assert.ok(contrastRatio(foreground, background) > 4.5);
  });
});
