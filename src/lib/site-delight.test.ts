import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("site delight surfaces", () => {
  it("loads site-delight.css from root layout", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    assert.match(layout, /site-delight\.css/);
  });

  it("styles team heroes with league accent data attributes", () => {
    const css = readFileSync("src/components/site-delight.css", "utf8");
    const teamPage = readFileSync("src/components/TeamCrewPage.tsx", "utf8");
    assert.match(css, /\.page-hero-team/);
    assert.match(teamPage, /page-hero-team/);
    assert.match(teamPage, /data-league=\{league\}/);
  });
});
