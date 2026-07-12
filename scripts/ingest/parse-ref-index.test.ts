import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { parseBbrBoxScoreOfficials } from "./parse-ref-index";

describe("parseBbrBoxScoreOfficials", () => {
  it("parses linked officials from modern BBR box scores", () => {
    const html = `
      <div><strong>Officials:&nbsp;</strong>
        <a href='/referees/brothto99r.html'>Tony Brothers</a>,
        <a href='/referees/oconn99r.html'>Pat O'Connell</a>,
        <a href='/referees/schwabr01r.html'>Brandon Schwab</a>
      </div>`;
    assert.deepEqual(parseBbrBoxScoreOfficials(html), [
      "Tony Brothers",
      "Pat O'Connell",
      "Brandon Schwab",
    ]);
  });

  it("parses cached SAC 2026-04-10 box score fixture when present", () => {
    const fixture = "/tmp/box.html";
    if (!fs.existsSync(fixture)) return;
    const officials = parseBbrBoxScoreOfficials(fs.readFileSync(fixture, "utf8"));
    assert.ok(officials.includes("Brandon Schwab"));
    assert.equal(officials.length, 3);
  });
});
