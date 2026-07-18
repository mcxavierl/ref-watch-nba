import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Clinical Modern OG image surfaces", () => {
  it("uses unified slate canvas and champagne gold branding", () => {
    const source = readSrc("src/lib/og-image.tsx");
    assert.match(source, /const BG_DEEP = "#020617"/);
    assert.match(source, /const CHAMPAGNE_GOLD = "#C5A059"/);
    assert.match(source, /const TEXT_HEADLINE = "#f8fafc"/);
    assert.match(source, /background: BG_DEEP/);
    assert.match(source, /color: CHAMPAGNE_GOLD/);
    assert.match(source, /fontFamily: OG_FONT_FAMILY/);
    assert.match(source, /OG_FONT_FAMILY = "Inter/);
    assert.doesNotMatch(source, /HEADER_GOLD_BRIGHT/);
    assert.doesNotMatch(source, /HEADER_GRADIENT/);
    assert.doesNotMatch(source, /HEADER_SAPPHIRE/);
    assert.doesNotMatch(source, /MARK_GRADIENT/);
  });

  it("uses bento metrics capsule and semantic whistle edge tints", () => {
    const source = readSrc("src/lib/og-image.tsx");
    assert.match(source, /function OgMetricsBento/);
    assert.match(source, /border: `1px solid \$\{BORDER_SLATE_700\}`/);
    assert.match(source, /color: TEXT_HEADLINE/);
    assert.match(source, /color: TEXT_LABEL/);
    assert.match(source, /function ogHighlightSurface/);
    assert.match(source, /rgba\(2, 44, 34, 0\.3\)/);
    assert.match(source, /#065f46/);
    assert.match(source, /rgba\(76, 5, 25, 0\.3\)/);
    assert.match(source, /#9f1239/);
    assert.match(source, /color: TEXT_HERO/);
    assert.match(source, /color: TEXT_NARRATIVE/);
  });

  it("loads Inter for ImageResponse rendering", () => {
    const fonts = readSrc("src/lib/og-fonts.ts");
    const og = readSrc("src/lib/og-image.tsx");
    assert.match(fonts, /name: "Inter"/);
    assert.match(fonts, /@fontsource\/inter\/files/);
    assert.match(fonts, /readFileSync/);
    assert.doesNotMatch(fonts, /fonts\.gstatic\.com/);
    assert.match(og, /loadOgFonts/);
    assert.match(og, /export async function renderBrandOgImage/);
  });

  it("opengraph routes await async OG renderers", () => {
    const routes = [
      "src/app/opengraph-image.tsx",
      "src/app/[league]/opengraph-image.tsx",
    ];
    for (const route of routes) {
      const source = readSrc(route);
      assert.match(source, /export default async function/);
    }
  });

  it("brand OG highlights rely on hero tone instead of league card backgrounds", () => {
    const source = readSrc("src/lib/og-brand.ts");
    assert.doesNotMatch(source, /OG_NHL_CARD_BG/);
    assert.doesNotMatch(source, /cardBackground/);
  });
});
