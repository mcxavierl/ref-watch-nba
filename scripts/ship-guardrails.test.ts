import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  isOverviewDataDependency,
  isOverviewSnapshotSource,
  OVERVIEW_SNAPSHOT_SOURCES,
} from "./overview-snapshot-sources";

function validateJobSteps(workflowPath: string): string[] {
  const source = readFileSync(workflowPath, "utf8");
  const validateBlock = source.match(/jobs:\s*\n\s*validate:[\s\S]*?(?=\n\s*\w+:|\Z)/);
  if (!validateBlock) {
    throw new Error(`${workflowPath} missing validate job`);
  }
  return [...validateBlock[0].matchAll(/^\s*- name: (.+)$/gm)].map((match) => match[1]);
}

describe("ship guardrail scripts", () => {
  it("check-coupled-test-changes passes on current branch", () => {
    execSync("npx tsx scripts/check-coupled-test-changes.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });

  it("tracks homepage insight gate files as overview snapshot sources", () => {
    const required = [
      "src/lib/homepage-insight-gates.ts",
      "src/config/methodology.ts",
      "src/lib/insight-editorial.ts",
      "src/lib/insights/insights-query.ts",
    ];
    for (const file of required) {
      if (!OVERVIEW_SNAPSHOT_SOURCES.includes(file as (typeof OVERVIEW_SNAPSHOT_SOURCES)[number])) {
        throw new Error(`missing overview snapshot source: ${file}`);
      }
      if (!isOverviewSnapshotSource(file)) {
        throw new Error(`isOverviewSnapshotSource should match ${file}`);
      }
    }
  });

  it("pre-push hook runs preflight and css-syntax before full check:ci", () => {
    const hook = readFileSync(".githooks/pre-push", "utf8");
    const preflightIndex = hook.indexOf("check:preflight");
    const cssIndex = hook.indexOf("check:css-syntax");
    const ciIndex = hook.indexOf("check:ci");
    if (preflightIndex < 0 || cssIndex < 0 || ciIndex < 0) {
      throw new Error("pre-push hook must run check:preflight, check:css-syntax, and check:ci");
    }
    if (!(preflightIndex < cssIndex && cssIndex < ciIndex)) {
      throw new Error("pre-push hook must run check:preflight before css-syntax before check:ci");
    }
  });

  it("validate workflows allow 20 minutes for build steps", () => {
    for (const file of [".github/workflows/ci.yml", ".github/workflows/deploy.yml"]) {
      const source = readFileSync(file, "utf8");
      if (!source.includes("timeout-minutes: 20")) {
        throw new Error(`${file} must set validate timeout-minutes: 20`);
      }
    }
  });

  it("ci and deploy validate jobs run the same gate sequence", () => {
    const ciSteps = validateJobSteps(".github/workflows/ci.yml");
    const deploySteps = validateJobSteps(".github/workflows/deploy.yml");
    if (JSON.stringify(ciSteps) !== JSON.stringify(deploySteps)) {
      throw new Error(
        `CI/deploy validate steps diverged.\nCI: ${ciSteps.join(" -> ")}\nDeploy: ${deploySteps.join(" -> ")}`,
      );
    }
  });

  it("deploy workflow forces full overview snapshot freshness", () => {
    const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
    if (!deploy.includes("ARTIFACT_FRESHNESS_FORCE")) {
      throw new Error("deploy.yml must set ARTIFACT_FRESHNESS_FORCE for artifact freshness");
    }
  });

  it("deploy script retries transient Cloudflare asset upload failures", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: { deploy?: string };
    };
    const deployScript = pkg.scripts?.deploy ?? "";
    if (!deployScript.includes("ensure-cloudflare-d1-binding.mjs")) {
      throw new Error("package.json deploy must run scripts/ensure-cloudflare-d1-binding.mjs");
    }
    if (!deployScript.includes("cloudflare-deploy-retry.mjs")) {
      throw new Error("package.json deploy must use scripts/cloudflare-deploy-retry.mjs");
    }
  });

  it("daily sports data refresh rebuilds overview snapshot", () => {
    const refresh = readFileSync(".github/workflows/refresh-sports-data.yml", "utf8");
    if (!refresh.includes("build-overview-snapshot")) {
      throw new Error("refresh-sports-data.yml must rebuild overview snapshot after data refresh");
    }
  });

  it("tracks league stats JSON as overview snapshot data dependencies", () => {
    if (!isOverviewDataDependency("data/cbb/ref-stats-core.json")) {
      throw new Error("CBB ref-stats-core must invalidate overview snapshot freshness");
    }
  });

  it("git push workflows declare contents: write and checkout token", () => {
    for (const file of [
      ".github/workflows/nightly-slate.yml",
      ".github/workflows/refresh-sports-data.yml",
    ]) {
      const source = readFileSync(file, "utf8");
      if (!/^permissions:\s*\n\s*contents: write/m.test(source)) {
        throw new Error(`${file} must declare permissions: contents: write for git push`);
      }
      if (!source.includes("token: ${{ secrets.GITHUB_TOKEN }}")) {
        throw new Error(`${file} checkout must pass secrets.GITHUB_TOKEN for git push`);
      }
    }
  });

  it("audit-ci-artifact-contract passes on current tree", () => {
    execSync("git restore data/overview-snapshot.json 2>/dev/null || true", {
      cwd: process.cwd(),
      stdio: "ignore",
    });
    execSync("npx tsx scripts/audit-ci-artifact-contract.ts", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });
});
