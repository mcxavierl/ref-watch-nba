import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";
import { copyWnbaAssignmentsToPublic } from "./refresh-slate";

describe("WNBA refresh slate", () => {
  const previousCwd = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wnba-refresh-"));

  after(() => {
    process.chdir(previousCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("mirrors assignments.json into public/data/wnba", () => {
    process.chdir(tempDir);
    const srcDir = path.join(tempDir, "data/wnba");
    fs.mkdirSync(srcDir, { recursive: true });
    const payload = { lastUpdated: "2026-07-21T00:00:00.000Z", games: [] };
    fs.writeFileSync(path.join(srcDir, "assignments.json"), `${JSON.stringify(payload)}\n`);

    copyWnbaAssignmentsToPublic();

    const dest = path.join(tempDir, "public/data/wnba/assignments.json");
    assert.ok(fs.existsSync(dest));
    assert.deepEqual(JSON.parse(fs.readFileSync(dest, "utf8")), payload);
  });
});
