#!/usr/bin/env npx tsx
/**
 * Guardrail: when validation sources change, backtest-results.json must be refreshed.
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  isValidationArtifactSource,
  VALIDATION_ARTIFACT_REL,
  VALIDATION_ARTIFACT_SOURCES,
} from "./validation-artifact-sources";

const ROOT = process.cwd();

function gitLines(args: string): string[] {
  try {
    return execSync(`git ${args}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles(): Set<string> {
  const base = process.env.GITHUB_BASE_SHA ?? "origin/main";
  const fromBase = gitLines(`diff --name-only ${base}...HEAD`);
  if (fromBase.length > 0) return new Set(fromBase);

  const staged = gitLines("diff --name-only --cached");
  const unstaged = gitLines("diff --name-only");
  return new Set([...staged, ...unstaged]);
}

function readJson(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function stripGeneratedAt(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const { generatedAt: _generatedAt, ...rest } = payload as Record<string, unknown>;
  return rest;
}

const changed = changedFiles();
const touchedSources = [...changed].filter((file) => isValidationArtifactSource(file));
const artifactTouched = changed.has(VALIDATION_ARTIFACT_REL);

if (touchedSources.length === 0) {
  console.log("check-validation-artifact-freshness: skipped (no validation sources changed)");
  process.exit(0);
}

const failures: string[] = [];

if (process.env.GITHUB_BASE_SHA && touchedSources.length > 0 && !artifactTouched) {
  failures.push(
    `validation sources changed (${touchedSources.join(", ")}) but ${VALIDATION_ARTIFACT_REL} was not updated — run: npm run validation:refresh && git add ${VALIDATION_ARTIFACT_REL} BACKTEST.md`,
  );
}

  if (!fs.existsSync(path.join(ROOT, VALIDATION_ARTIFACT_REL))) {
  failures.push(`${VALIDATION_ARTIFACT_REL} missing — run: npm run validation:refresh`);
} else if (failures.length === 0) {
  const onDisk = stripGeneratedAt(readJson(VALIDATION_ARTIFACT_REL));
  execSync("npm run backtest", { cwd: ROOT, stdio: "pipe" });
  const fresh = stripGeneratedAt(readJson(VALIDATION_ARTIFACT_REL));
  if (JSON.stringify(onDisk) !== JSON.stringify(fresh)) {
    failures.push(
      `${VALIDATION_ARTIFACT_REL} is stale — run: npm run validation:refresh && git add ${VALIDATION_ARTIFACT_REL} BACKTEST.md`,
    );
  }
}

if (failures.length > 0) {
  console.error("check-validation-artifact-freshness FAILED:\n");
  for (const msg of failures) {
    console.error(`  ✗ ${msg}`);
  }
  console.error(
    `\nTracked validation sources:\n${VALIDATION_ARTIFACT_SOURCES.map((file) => `  - ${file}`).join("\n")}`,
  );
  process.exit(1);
}

console.log("check-validation-artifact-freshness: OK");
