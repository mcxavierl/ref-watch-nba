import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  archetypeChipClass,
  buildSeasonTrendRows,
  formatLeverageSensitivity,
  hasSeasonTrendData,
} from "@/lib/ref-profile-season-trends";
import { STATE_CHIP_CLASS } from "@/constants/colors";
import type { SeasonOfficialStatsEntry } from "@/lib/types";

const okEntry = (
  overrides: Partial<Extract<SeasonOfficialStatsEntry, { status: "ok" }>> = {},
): Extract<SeasonOfficialStatsEntry, { status: "ok" }> => ({
  status: "ok",
  primary_archetype: "procedural-stickler",
  consistency_score: 6,
  admin_ratio: 1.62,
  pressure_sensitive: true,
  pressure_delta_pct: 0.24,
  sample_games: 42,
  last_calculated: "2026-07-20T00:00:00.000Z",
  leverage_index: 0.25,
  leverage_profile: "high-leverage-sensitivity",
  early_period_foul_rate: 4.8,
  high_pressure_foul_rate: 6.1,
  leverage_sample_games: 42,
  close_game_sample: 12,
  split_backed_games: 0,
  ...overrides,
});

describe("ref profile season trends", () => {
  it("maps archetypes to terminal state chip classes", () => {
    assert.equal(archetypeChipClass("procedural-stickler"), STATE_CHIP_CLASS.risk);
    assert.equal(archetypeChipClass("game-flow-manager"), STATE_CHIP_CLASS.stable);
    assert.equal(archetypeChipClass("balanced"), STATE_CHIP_CLASS.neutral);
  });

  it("builds all-season rows in descending season order", () => {
    const rows = buildSeasonTrendRows(
      {
        "2021-22": okEntry({ primary_archetype: "game-flow-manager", admin_ratio: 0.55 }),
        "2024-25": okEntry(),
        "2023-24": okEntry({ primary_archetype: "balanced", admin_ratio: 1.0 }),
      },
      "all",
    );

    assert.equal(rows.length, 3);
    assert.equal(rows[0]?.season, "2024-25");
    assert.equal(rows[1]?.season, "2023-24");
    assert.equal(rows[2]?.season, "2021-22");
    assert.equal(rows[0]?.kind, "ok");
    if (rows[0]?.kind === "ok") {
      assert.equal(rows[0].archetypeLabel, "Procedural Stickler");
      assert.equal(rows[0].foulRatio, 1.62);
      assert.equal(rows[0].leverageSensitivity, "+25%");
      assert.equal(rows[0].consistency, 6);
    }
  });

  it("limits recent trends to the latest three seasons", () => {
    const rows = buildSeasonTrendRows(
      {
        "2021-22": okEntry(),
        "2022-23": okEntry(),
        "2023-24": okEntry(),
        "2024-25": okEntry(),
        "2025-26": okEntry(),
      },
      "recent",
    );

    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.season),
      ["2025-26", "2024-25", "2023-24"],
    );
  });

  it("preserves insufficient-data seasons as muted rows", () => {
    const rows = buildSeasonTrendRows(
      {
        "2024-25": {
          status: "INSUFFICIENT_DATA",
          sample_games: 7,
          last_calculated: "2026-07-20T00:00:00.000Z",
        },
      },
      "all",
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.kind, "insufficient");
    if (rows[0]?.kind === "insufficient") {
      assert.equal(rows[0].sampleGames, 7);
    }
  });

  it("formats leverage sensitivity labels for profile states", () => {
    assert.equal(
      formatLeverageSensitivity(
        okEntry({ leverage_index: null, leverage_profile: "swallows-whistle" }),
      ),
      "Swallows Whistle",
    );
    assert.equal(hasSeasonTrendData(undefined), false);
    assert.equal(hasSeasonTrendData({ "2024-25": okEntry() }), true);
  });
});
