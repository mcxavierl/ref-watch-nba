import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";

describe("check-generated-artifact-tests guardrail", () => {
  it("passes on the current test suite", () => {
    execSync("npx tsx scripts/check-generated-artifact-tests.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });

  it("flags hardcoded refSlug pins in generated-artifact tests", () => {
    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-test-probe-"));
    const probeFile = path.join(probeDir, "probe.test.ts");
    fs.writeFileSync(
      probeFile,
      `import overviewInsightsJson from "../../data/overview-insights.json";
const cards = overviewInsightsJson.cards;
const card = cards.find((entry) => entry.refSlug === "pinned-slug");
`,
    );

    const script = fs.readFileSync(
      path.join(process.cwd(), "scripts/check-generated-artifact-tests.ts"),
      "utf8",
    );
    const runner = `${script.replace(
      'for (const dir of ["src", "scripts"]) {',
      `checkTestFile(${JSON.stringify(probeFile)}); if (false) {`,
    )}`;

    assert.throws(
      () => {
        execSync("npx tsx -", {
          cwd: process.cwd(),
          input: runner,
          stdio: ["pipe", "pipe", "pipe"],
        });
      },
      (err: NodeJS.ErrnoException) => err.status !== 0,
    );

    fs.rmSync(probeDir, { recursive: true, force: true });
  });
});
