import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSIGNMENT_WINDOW_END_HOUR,
  ASSIGNMENT_WINDOW_START_HOUR,
  easternHour,
  isWithinAssignmentWindow,
} from "@/lib/cron/assignment-window";

describe("assignment-window", () => {
  it("exposes an 8 AM through noon ET release window", () => {
    assert.equal(ASSIGNMENT_WINDOW_START_HOUR, 8);
    assert.equal(ASSIGNMENT_WINDOW_END_HOUR, 12);
  });

  it("returns eastern hour for a known UTC instant", () => {
    // 2026-07-21 12:30 UTC = 8:30 AM EDT
    assert.equal(easternHour(new Date("2026-07-21T12:30:00.000Z")), 8);
    // 2026-01-21 13:30 UTC = 8:30 AM EST
    assert.equal(easternHour(new Date("2026-01-21T13:30:00.000Z")), 8);
  });

  it("is inside the window during morning release hours", () => {
    assert.equal(isWithinAssignmentWindow(new Date("2026-07-21T12:00:00.000Z")), true);
    assert.equal(isWithinAssignmentWindow(new Date("2026-07-21T15:30:00.000Z")), true);
  });

  it("is outside the window before 8 AM and from noon onward ET", () => {
    assert.equal(isWithinAssignmentWindow(new Date("2026-07-21T11:59:00.000Z")), false);
    assert.equal(isWithinAssignmentWindow(new Date("2026-07-21T16:00:00.000Z")), false);
    assert.equal(isWithinAssignmentWindow(new Date("2026-07-21T20:00:00.000Z")), false);
  });
});
