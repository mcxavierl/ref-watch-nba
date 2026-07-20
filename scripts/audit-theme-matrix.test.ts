import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contrastRatio,
  minContrastRatio,
  parseCssColor,
  relativeLuminance,
} from "./lib/contrast-math";
import { evaluateProbeMeasurement } from "./lib/theme-matrix-browser";
import { THEME_MATRIX_PAGES, THEME_MATRIX_VARIANTS } from "./lib/theme-matrix-config";

describe("contrast math", () => {
  it("parses modern rgb() syntax", () => {
    const parsed = parseCssColor("rgb(255 255 255)");
    assert.ok(parsed);
    assert.equal(parsed.r, 255);
    assert.equal(parsed.g, 255);
    assert.equal(parsed.b, 255);
  });

  it("parses color(srgb) syntax from computed styles", () => {
    const parsed = parseCssColor("color(srgb 0.904314 0.400471 0.480471)");
    assert.ok(parsed);
    assert.ok(parsed.r > 200);
  });

  it("computes white-on-slate-950 contrast above WCAG AA", () => {
    const foreground = parseCssColor("rgb(248 250 252)");
    const background = parseCssColor("rgb(2 6 23)");
    assert.ok(foreground && background);
    const ratio = contrastRatio(foreground, background);
    assert.ok(ratio >= 15);
  });

  it("flags dark ink on dark capsule as low contrast", () => {
    const foreground = parseCssColor("rgb(15 23 42)");
    const background = parseCssColor("rgb(2 6 23)");
    assert.ok(foreground && background);
    const ratio = contrastRatio(foreground, background);
    assert.ok(ratio < 2);
    assert.ok(relativeLuminance(background) < 0.12);
    assert.ok(relativeLuminance(foreground) < 0.05);
  });

  it("requires stronger ratios in high-contrast mode", () => {
    assert.equal(minContrastRatio(false, true), 7);
    assert.equal(minContrastRatio(true, true), 4.5);
  });
});

describe("theme matrix config", () => {
  it("covers light, dark, and high-contrast variants", () => {
    const labels = THEME_MATRIX_VARIANTS.map((variant) => variant.label);
    assert.deepEqual(labels, [
      "light-default",
      "dark-default",
      "light-high",
      "dark-high",
    ]);
  });

  it("includes homepage, league hub, and WC fixture routes", () => {
    const paths = THEME_MATRIX_PAGES.map((page) => page.path);
    assert.deepEqual(paths, ["/", "/nba", "/theme-matrix"]);
  });

  it("detects light-mode dark ink regression on always-dark capsules", () => {
    const variant = THEME_MATRIX_VARIANTS[0];
    const probe = {
      selector: ".wc-data-capsule h3",
      name: "wc headline",
      requireLightInkOnDarkSurface: true,
    };
    const failure = evaluateProbeMeasurement("theme-matrix-fixture", variant, probe, {
      found: true,
      foreground: "rgb(15, 23, 42)",
      background: "rgb(2, 6, 23)",
      fontSizePx: 14,
      fontWeight: 500,
      sampleText: "Spain conceded 4 goals",
    }).failure;

    assert.ok(failure);
    assert.match(failure.message, /always-dark surface|below 4\.5:1/);

    const mutedLink = evaluateProbeMeasurement("theme-matrix-fixture", variant, probe, {
      found: true,
      foreground: "rgb(148, 163, 184)",
      background: "rgb(2, 6, 23)",
      fontSizePx: 12,
      fontWeight: 400,
      sampleText: "FIFA match centre",
    }).failure;

    assert.equal(mutedLink, null);
  });
});
