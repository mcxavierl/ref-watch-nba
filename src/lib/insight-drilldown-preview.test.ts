import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hiddenInsightDrilldownGameCount,
  insightDrilldownExpandLabel,
  insightDrilldownHasSpreadData,
  INSIGHT_DRILLDOWN_GAMES_PREVIEW_COUNT,
  visibleInsightDrilldownGames,
} from "./insight-drilldown-preview";

const sampleGames = Array.from({ length: 8 }, (_, index) => ({ id: index }));

test("preview count defaults to five games", () => {
  assert.equal(INSIGHT_DRILLDOWN_GAMES_PREVIEW_COUNT, 5);
});

test("collapsed drill-down shows first five games", () => {
  const visible = visibleInsightDrilldownGames(sampleGames, false);
  assert.equal(visible.length, 5);
  assert.deepEqual(
    visible.map((game) => game.id),
    [0, 1, 2, 3, 4],
  );
});

test("expanded drill-down shows all games", () => {
  const visible = visibleInsightDrilldownGames(sampleGames, true);
  assert.equal(visible.length, 8);
});

test("hidden count hides expand affordance at five or fewer games", () => {
  assert.equal(hiddenInsightDrilldownGameCount(sampleGames.slice(0, 5), false), 0);
  assert.equal(hiddenInsightDrilldownGameCount(sampleGames, false), 3);
  assert.equal(hiddenInsightDrilldownGameCount(sampleGames, true), 0);
});

test("expand labels include hidden game count", () => {
  assert.equal(insightDrilldownExpandLabel(3, false), "View 3 more games");
  assert.equal(insightDrilldownExpandLabel(1, false), "View 1 more game");
  assert.equal(insightDrilldownExpandLabel(0, true), "Show fewer games");
});

test("spread column only renders when at least one game has line data", () => {
  assert.equal(
    insightDrilldownHasSpreadData([
      { spreadCovered: null },
      { spreadCovered: null },
    ]),
    false,
  );
  assert.equal(
    insightDrilldownHasSpreadData([
      { spreadCovered: null },
      { spreadCovered: true },
    ]),
    true,
  );
});
