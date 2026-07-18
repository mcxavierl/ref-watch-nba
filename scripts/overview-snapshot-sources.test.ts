import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOverviewDataDependency,
  isOverviewSnapshotInvalidatingChange,
} from "./overview-snapshot-sources";

describe("overview snapshot invalidation sources", () => {
  it("treats league stats and game logs as snapshot dependencies", () => {
    assert.equal(isOverviewDataDependency("data/cbb/ref-stats-core.json"), true);
    assert.equal(isOverviewDataDependency("data/nfl/game-logs.json"), true);
    assert.equal(isOverviewDataDependency("data/baselines.json"), true);
    assert.equal(isOverviewDataDependency("data/nhl/assignments.json"), true);
    assert.equal(isOverviewDataDependency("src/components/OverviewHero.tsx"), false);
  });

  it("groups code, data, and snapshot paths for freshness checks", () => {
    assert.equal(
      isOverviewSnapshotInvalidatingChange("src/lib/cross-league-overview.ts"),
      true,
    );
    assert.equal(isOverviewSnapshotInvalidatingChange("data/overview-snapshot.json"), true);
    assert.equal(isOverviewSnapshotInvalidatingChange("data/cbb/ref-stats.json"), true);
    assert.equal(isOverviewSnapshotInvalidatingChange("README.md"), false);
  });
});
