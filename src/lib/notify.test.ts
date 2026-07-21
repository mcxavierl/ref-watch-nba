import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSeasonNotifyPayload } from "@/lib/notify";

describe("parseSeasonNotifyPayload", () => {
  it("accepts supported league signup payloads", () => {
    const payload = parseSeasonNotifyPayload({
      email: "mira.romero@gmail.com",
      league: "NFL",
    });
    assert.deepEqual(payload, {
      email: "mira.romero@gmail.com",
      league: "NFL",
    });
  });

  it("rejects unknown leagues", () => {
    assert.equal(
      parseSeasonNotifyPayload({
        email: "mira.romero@gmail.com",
        league: "MLB",
      }),
      null,
    );
  });

  it("rejects invalid emails", () => {
    assert.equal(
      parseSeasonNotifyPayload({
        email: "not-an-email",
        league: "NBA",
      }),
      null,
    );
  });
});
