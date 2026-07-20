import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  spotlightAccentForCard,
  spotlightCardTone,
  spotlightIconForCard,
} from "@/lib/highlight-card-visuals";
import { Percent, TrendingUp } from "lucide-react";

describe("trend spotlight visuals", () => {
  it("maps over-rate cards to over accent and percent icon", () => {
    const card = { kicker: "#1 · Highest over rate", heroLabel: "Over rate" };
    assert.equal(spotlightAccentForCard(card), "over");
    assert.equal(spotlightIconForCard(card), Percent);
    assert.equal(spotlightCardTone("positive"), "positive");
  });

  it("uses RefCard shell and glow season badge in spotlight cards", () => {
    const cardSource = readFileSync(
      join(process.cwd(), "src/components/RefsTrendSpotlightCard.tsx"),
      "utf8",
    );
    const sectionSource = readFileSync(
      join(process.cwd(), "src/components/RefsTrendSpotlight.tsx"),
      "utf8",
    );
    assert.match(cardSource, /RefCard/);
    assert.match(cardSource, /variant="glow"/);
    assert.match(cardSource, /insight-editorial-metric--primary/);
    assert.match(sectionSource, /rankings-insight-grid refs-trend-spotlight-track/);
  });

  it("maps games-led cards to scoring accent", () => {
    const card = { kicker: "#1 · Most experienced", heroLabel: "Games" };
    assert.equal(spotlightAccentForCard(card), "scoring");
    assert.equal(spotlightIconForCard(card), TrendingUp);
  });
});
