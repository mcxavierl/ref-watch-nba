import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { worldCupKpiTone } from "@/components/worldcup/WorldCupKpiValue";

describe("worldCupKpiTone", () => {
  it("marks card and goals-against stats as negative", () => {
    assert.equal(
      worldCupKpiTone({ label: "Yellow cards", value: "6" }),
      "negative",
    );
    assert.equal(worldCupKpiTone({ label: "Red cards", value: "1" }), "negative");
    assert.equal(
      worldCupKpiTone({ label: "Goals against", value: "2" }),
      "negative",
    );
  });

  it("marks comebacks as positive", () => {
    assert.equal(
      worldCupKpiTone({ label: "Knockout comebacks", value: "3" }),
      "positive",
    );
  });

  it("marks record and split goals as neutral for partial highlights", () => {
    assert.equal(
      worldCupKpiTone({ label: "Record", value: "6W-1D-0L" }),
      "neutral",
    );
    assert.equal(
      worldCupKpiTone({ label: "Goals", value: "22-9" }),
      "neutral",
    );
  });

  it("marks referee names as name tone", () => {
    assert.equal(
      worldCupKpiTone({ label: "Referee", value: "Slavko Vinčić" }),
      "name",
    );
  });
});
