import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { worldCupKpiTone } from "@/components/worldcup/WorldCupKpiValue";

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

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

  it("uses text-6xl record scale and text-7xl dominant KPI scale", () => {
    const source = readSrc("src/components/worldcup/WorldCupKpiValue.tsx");
    assert.match(source, /RECORD_CLASS = "text-6xl font-black/);
    assert.match(source, /KPI_CLASS = "text-7xl font-black/);
    assert.match(source, /text-slate-100/);
  });

  it("marks referee names as name tone", () => {
    assert.equal(
      worldCupKpiTone({ label: "Referee", value: "Slavko Vinčić" }),
      "name",
    );
  });
});
