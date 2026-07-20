#!/usr/bin/env npx tsx
/**
 * CI and generated-artifact contract audit for Ref Watch.
 *
 * Validates workflow push permissions, snapshot source tracking, coupled-test
 * coverage, and that local check:ci mirrors GitHub validate.
 *
 * Usage: npm run audit:ci-artifact-contract
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COUPLED_TEST_RULES } from "./check-coupled-test-changes";
import {
  OVERVIEW_SNAPSHOT_SOURCES,
  isOverviewDataDependency,
  isOverviewSnapshotSource,
} from "./overview-snapshot-sources";

const ROOT = join(import.meta.dirname, "..");
const REPORT_PATH = join(ROOT, "CI-ARTIFACT-CONTRACT-AUDIT.md");
const WORKFLOW_DIR = join(ROOT, ".github/workflows");

type Severity = "pass" | "fail";

type AuditFinding = {
  area: string;
  severity: Severity;
  detail: string;
};

type AuditResult = { ok: true } | { ok: false; message: string };

type WorkflowContract = {
  file: string;
  name: string;
  triggers: string;
  permissions: string;
  pushesToGit: boolean;
  checkoutToken: boolean;
  concurrency: string;
  followUpOnSnapshotChange: string;
};

const PRE_MERGE_CHECKLIST: Array<{ step: string; command: string; ciStep: string }> = [
  { step: "Refactor safety", command: "npm run check:refactor-safety", ciStep: "Refactor safety checks" },
  { step: "Client import boundary", command: "npm run check:client-imports", ciStep: "Client import boundary check" },
  { step: "Typecheck", command: "npm run typecheck", ciStep: "Typecheck" },
  { step: "Generated artifact freshness", command: "npm run check:artifact-freshness", ciStep: "Generated artifact freshness" },
  { step: "Validation artifact freshness", command: "npm run check:validation-freshness", ciStep: "Validation artifact freshness" },
  { step: "Coupled test gate", command: "npm run check:coupled-tests", ciStep: "Coupled test change gate" },
  { step: "Volume regression", command: "npm run check:volume", ciStep: "Volume regression gate" },
  { step: "Deploy data artifacts", command: "npm run check:deploy", ciStep: "Generate deploy data artifacts" },
  { step: "CSS syntax", command: "npm run check:css-syntax", ciStep: "CSS syntax check" },
  { step: "Next.js build", command: "npm run build:next", ciStep: "Next.js production build" },
  { step: "Theme matrix contrast", command: "npm run audit:theme-matrix", ciStep: "Theme matrix contrast audit" },
  { step: "Color drift", command: "npm run audit:color-drift", ciStep: "Color drift audit" },
  { step: "Design token parity", command: "npm run audit:design-tokens", ciStep: "Design token parity audit" },
  { step: "Unit tests", command: "npm run test", ciStep: "Unit tests" },
  { step: "Honesty audit", command: "npm run honesty-audit", ciStep: "Honesty audit" },
];

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

function auditFileContains(relPath: string, pattern: RegExp, label: string): AuditResult {
  if (!existsSync(join(ROOT, relPath))) {
    return { ok: false, message: `${relPath} missing` };
  }
  if (!pattern.test(read(relPath))) {
    return { ok: false, message: `${label} missing in ${relPath}` };
  }
  return { ok: true };
}

function parseWorkflowContracts(): WorkflowContract[] {
  const files = ["ci.yml", "deploy.yml", "nightly-slate.yml", "refresh-sports-data.yml", "volume-regression.yml"];
  return files.map((file) => {
    const source = read(join(".github/workflows", file));
    const nameMatch = source.match(/^name: (.+)$/m);
    const permissionsMatch = source.match(/^permissions:\s*\n\s*contents: (\w+)/m);
    const concurrencyMatch = source.match(/concurrency:\s*\n\s*group: ([^\n]+)/);
    const pushesToGit = /git push/.test(source);
    const checkoutToken = /token: \$\{\{ secrets\.GITHUB_TOKEN \}\}/.test(source);
    const onBlock = source.match(/^on:\s*\n([\s\S]*?)(?=\n(?:permissions|concurrency|jobs):)/m);
    const triggers = onBlock
      ? onBlock[1]
          .trim()
          .replace(/\n\s+/g, " ")
          .slice(0, 80)
      : "unknown";

    let followUp = "none";
    if (isOverviewSnapshotSource(file)) followUp = "n/a";
    if (source.includes("build-overview-snapshot")) {
      followUp = "npx tsx scripts/build-overview-snapshot.ts && git add data/overview-snapshot.json";
    } else if (source.includes("nightly-slate")) {
      followUp = "npm run nightly-slate && git add data/overview-snapshot.json data/overview-insights.json";
    } else if (pushesToGit && source.includes("git add data/")) {
      followUp = "commit refreshed data/ artifacts";
    } else if (source.includes("check:artifact-freshness")) {
      followUp = "npm run check:artifact-freshness (rebuild snapshot if stale)";
    }

    return {
      file,
      name: nameMatch?.[1] ?? file,
      triggers,
      permissions: permissionsMatch?.[1] ?? (pushesToGit ? "missing (default read-only)" : "default"),
      pushesToGit,
      checkoutToken,
      concurrency: concurrencyMatch?.[1]?.trim() ?? "none",
      followUpOnSnapshotChange: followUp,
    };
  });
}

function validateJobSteps(workflowPath: string): string[] {
  const source = read(workflowPath);
  const start = source.indexOf("  validate:");
  if (start < 0) return [];
  let end = source.length;
  for (const marker of ["\n  deploy:", "\n  refresh:", "\n  volume:", "\n  notify-failure:"]) {
    const idx = source.indexOf(marker, start + 1);
    if (idx > 0) end = Math.min(end, idx);
  }
  const block = source.slice(start, end);
  return [...block.matchAll(/^\s*- name: (.+)$/gm)].map((match) => match[1]!);
}

const staticChecks: Array<{ name: string; area: string; run: () => AuditResult }> = [
  {
    name: "check:ci mirrors GitHub validate gate sequence",
    area: "Pre-merge contract",
    run: () => {
      const pkg = read("package.json");
      const checkCiMatch = pkg.match(/"check:ci": "([^"]+)"/);
      if (!checkCiMatch) return { ok: false, message: "check:ci script missing" };
      const expected = PRE_MERGE_CHECKLIST.map((item) => item.command.replace("npm run ", ""));
      const actual = checkCiMatch[1].split(" && ").map((cmd) => cmd.replace("npm run ", ""));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        return {
          ok: false,
          message: `check:ci sequence mismatch.\nExpected: ${expected.join(" -> ")}\nActual: ${actual.join(" -> ")}`,
        };
      }
      return { ok: true };
    },
  },
  {
    name: "CI and deploy validate jobs share the same steps",
    area: "Workflow parity",
    run: () => {
      const ciSteps = validateJobSteps(".github/workflows/ci.yml");
      const deploySteps = validateJobSteps(".github/workflows/deploy.yml");
      if (ciSteps.length === 0 || deploySteps.length === 0) {
        return { ok: false, message: "missing validate job steps in ci.yml or deploy.yml" };
      }
      if (JSON.stringify(ciSteps) !== JSON.stringify(deploySteps)) {
        return {
          ok: false,
          message: `CI/deploy validate steps diverged.\nCI: ${ciSteps.join(" -> ")}\nDeploy: ${deploySteps.join(" -> ")}`,
        };
      }
      return { ok: true };
    },
  },
  {
    name: "Deploy workflow forces full artifact freshness",
    area: "Deploy path",
    run: () =>
      auditFileContains(
        ".github/workflows/deploy.yml",
        /ARTIFACT_FRESHNESS_FORCE:\s*"1"/,
        "ARTIFACT_FRESHNESS_FORCE on deploy validate",
      ),
  },
  {
    name: "PR CI passes GITHUB_BASE_SHA to artifact and coupled gates",
    area: "Workflow parity",
    run: () => {
      const ci = read(".github/workflows/ci.yml");
      if (!ci.includes("GITHUB_BASE_SHA: ${{ github.event.pull_request.base.sha }}")) {
        return { ok: false, message: "ci.yml must pass GITHUB_BASE_SHA to freshness/coupled gates" };
      }
      if (!ci.includes("check:artifact-freshness") || !ci.includes("check:coupled-tests")) {
        return { ok: false, message: "ci.yml must run artifact freshness and coupled test gates" };
      }
      return { ok: true };
    },
  },
  {
    name: "Nightly slate workflow can push commits",
    area: "Git push workflows",
    run: () => {
      const wf = read(".github/workflows/nightly-slate.yml");
      if (!/^permissions:\s*\n\s*contents: write/m.test(wf)) {
        return { ok: false, message: "nightly-slate.yml missing permissions: contents: write" };
      }
      if (!wf.includes("token: ${{ secrets.GITHUB_TOKEN }}")) {
        return { ok: false, message: "nightly-slate.yml checkout missing GITHUB_TOKEN" };
      }
      return { ok: true };
    },
  },
  {
    name: "Refresh sports data workflow can push commits",
    area: "Git push workflows",
    run: () => {
      const wf = read(".github/workflows/refresh-sports-data.yml");
      if (!/^permissions:\s*\n\s*contents: write/m.test(wf)) {
        return { ok: false, message: "refresh-sports-data.yml missing permissions: contents: write" };
      }
      if (!wf.includes("token: ${{ secrets.GITHUB_TOKEN }}")) {
        return { ok: false, message: "refresh-sports-data.yml checkout missing GITHUB_TOKEN" };
      }
      return { ok: true };
    },
  },
  {
    name: "Daily refresh rebuilds overview snapshot",
    area: "Deploy path",
    run: () =>
      auditFileContains(
        ".github/workflows/refresh-sports-data.yml",
        /build-overview-snapshot/,
        "overview snapshot rebuild in refresh-sports-data.yml",
      ),
  },
  {
    name: "Overview snapshot sources file exists for all tracked paths",
    area: "Snapshot sources",
    run: () => {
      for (const rel of OVERVIEW_SNAPSHOT_SOURCES) {
        if (!existsSync(join(ROOT, rel))) {
          return { ok: false, message: `overview snapshot source missing on disk: ${rel}` };
        }
      }
      return { ok: true };
    },
  },
  {
    name: "Overview snapshot invalidation includes league stats JSON",
    area: "Snapshot sources",
    run: () => {
      if (!isOverviewDataDependency("data/nba/ref-stats-core.json")) {
        return { ok: false, message: "league ref-stats-core must invalidate snapshot freshness" };
      }
      if (!isOverviewSnapshotSource("src/lib/insight-editorial.ts")) {
        return { ok: false, message: "insight-editorial.ts must be tracked snapshot source" };
      }
      return { ok: true };
    },
  },
  {
    name: "Coupled-test rules reference existing source and test files",
    area: "Coupled tests",
    run: () => {
      for (const rule of COUPLED_TEST_RULES) {
        for (const rel of [...rule.sources, ...rule.tests]) {
          if (!existsSync(join(ROOT, rel))) {
            return { ok: false, message: `${rule.label}: missing file ${rel}` };
          }
        }
      }
      return { ok: true };
    },
  },
  {
    name: "Build script invokes artifact contract audits",
    area: "Repository guardrails",
    run: () => {
      const pkg = read("package.json");
      if (!pkg.includes("audit:ci-artifact-contract")) {
        return { ok: false, message: "package.json missing audit:ci-artifact-contract script" };
      }
      if (!pkg.includes("audit-ci-artifact-contract.ts")) {
        return { ok: false, message: "build must invoke audit-ci-artifact-contract" };
      }
      return { ok: true };
    },
  },
  {
    name: "check-artifact-freshness gate is wired in CI validate",
    area: "Deploy path",
    run: () =>
      auditFileContains(
        ".github/workflows/ci.yml",
        /check:artifact-freshness/,
        "artifact freshness step in ci.yml",
      ),
  },
  {
    name: "Pre-merge checklist doc mirrors validate job",
    area: "Pre-merge contract",
    run: () =>
      auditFileContains(
        "docs/PRE-MERGE-CHECKLIST.md",
        /npm run check:ci/,
        "pre-merge checklist references check:ci",
      ),
  },
];

const runtimeChecks: Array<{ name: string; area: string; run: () => AuditResult }> = [
  {
    name: "check-coupled-test-changes passes on current tree",
    area: "Coupled tests",
    run: () => {
      try {
        execSync("npx tsx scripts/check-coupled-test-changes.ts", {
          cwd: ROOT,
          stdio: "pipe",
        });
        return { ok: true };
      } catch (error) {
        const err = error as { stderr?: Buffer; stdout?: Buffer };
        const msg = (err.stderr ?? err.stdout)?.toString().trim() ?? "coupled test gate failed";
        return { ok: false, message: msg.split("\n")[0] ?? msg };
      }
    },
  },
];

function writeReport(
  findings: AuditFinding[],
  workflows: WorkflowContract[],
  passed: number,
  total: number,
): void {
  const fails = findings.filter((f) => f.severity === "fail");
  const lines = [
    "# CI and artifact contract audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Pre-merge checklist (mirrors GitHub validate)",
    "",
    "Run locally before opening or merging a PR:",
    "",
    "```bash",
    "npm run check:ci",
    "```",
    "",
    "Or step-by-step:",
    "",
    ...PRE_MERGE_CHECKLIST.map(
      (item, index) => `${index + 1}. **${item.step}** (\`${item.command}\`) - CI step: ${item.ciStep}`,
    ),
    "",
    "When overview snapshot sources change, also run:",
    "",
    "```bash",
    "npx tsx scripts/build-overview-snapshot.ts && git add data/overview-snapshot.json",
    "```",
    "",
    "## Workflow matrix",
    "",
    "| Workflow | Push to git | Permissions | Checkout token | Concurrency | Follow-up on data change |",
    "| --- | --- | --- | --- | --- | --- |",
    ...workflows.map(
      (wf) =>
        `| ${wf.name} | ${wf.pushesToGit ? "yes" : "no"} | ${wf.permissions} | ${wf.checkoutToken ? "yes" : "no"} | ${wf.concurrency} | ${wf.followUpOnSnapshotChange} |`,
    ),
    "",
    "## Summary",
    "",
    "| Result | Count |",
    "| --- | ---: |",
    `| Pass | ${passed} |`,
    `| Fail | ${fails.length} |`,
    `| Total checks | ${total} |`,
    "",
  ];

  if (fails.length > 0) {
    lines.push("## Failures", "");
    for (const finding of fails) {
      lines.push(`- **${finding.area}:** ${finding.detail}`);
    }
    lines.push("");
  } else {
    lines.push("No CI or artifact contract violations flagged.", "");
  }

  lines.push("Re-run: `npm run audit:ci-artifact-contract`", "");
  writeFileSync(REPORT_PATH, lines.join("\n"));
}

function main(): void {
  const findings: AuditFinding[] = [];
  const failures: string[] = [];
  let passed = 0;
  const workflows = parseWorkflowContracts();
  const allChecks = [...staticChecks, ...runtimeChecks];

  console.log("CI and generated-artifact contract audit\n");

  console.log("Workflow matrix:");
  for (const wf of workflows) {
    console.log(
      `  - ${wf.name}: push=${wf.pushesToGit ? "yes" : "no"}, permissions=${wf.permissions}, token=${wf.checkoutToken ? "yes" : "no"}`,
    );
  }
  console.log("");

  for (const check of allChecks) {
    const result = check.run();
    if (result.ok) {
      console.log(`  ✓ ${check.name}`);
      findings.push({ area: check.area, severity: "pass", detail: check.name });
      passed += 1;
    } else {
      console.error(`  ✗ ${check.name}: ${result.message}`);
      findings.push({
        area: check.area,
        severity: "fail",
        detail: `${check.name}: ${result.message}`,
      });
      failures.push(`${check.name}: ${result.message}`);
    }
  }

  writeReport(findings, workflows, passed, allChecks.length);

  if (failures.length > 0) {
    console.error(
      `\nCI artifact contract audit failed (${failures.length} issue(s)). See ${REPORT_PATH}`,
    );
    process.exit(1);
  }

  console.log(
    `\nCI artifact contract audit passed (${allChecks.length} checks). Report: ${REPORT_PATH}`,
  );
}

main();
