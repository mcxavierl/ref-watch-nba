import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { OVERVIEW_SNAPSHOT_SOURCES } from "./overview-snapshot-sources";

const ROOT = process.cwd();
const WORKFLOW_DIR = join(ROOT, ".github/workflows");

describe("check-generated-artifact-tests guardrail", () => {
  it("passes on the current test suite", () => {
    execSync("npx tsx scripts/check-generated-artifact-tests.ts", {
      cwd: ROOT,
      stdio: "pipe",
    });
  });

  it("overview snapshot source files exist on disk", () => {
    for (const rel of OVERVIEW_SNAPSHOT_SOURCES) {
      if (!existsSync(join(ROOT, rel))) {
        throw new Error(`overview snapshot source missing: ${rel}`);
      }
    }
  });

  it("build script rebuilds overview snapshot before contract audit", () => {
    const build = readFileSync(join(ROOT, "package.json"), "utf8");
    const snapshotIndex = build.indexOf("build-overview-snapshot.ts");
    const auditIndex = build.indexOf("audit-ci-artifact-contract.ts");
    if (snapshotIndex < 0 || auditIndex < 0 || snapshotIndex > auditIndex) {
      throw new Error("build must run build-overview-snapshot.ts before audit-ci-artifact-contract.ts");
    }
  });

  it("workflows with git push declare permissions: contents: write", () => {
    for (const file of readdirSync(WORKFLOW_DIR).filter((name) => name.endsWith(".yml"))) {
      const source = readFileSync(join(WORKFLOW_DIR, file), "utf8");
      if (!source.includes("git push")) continue;
      if (!/^permissions:\s*\n\s*contents: write/m.test(source)) {
        throw new Error(`${file} runs git push but missing permissions: contents: write`);
      }
    }
  });
});
