#!/usr/bin/env npx tsx
/**
 * CFB conference expansion deploy gate — dry-run ingest, contract tests, volume check.
 *
 * Usage:
 *   npm run test-cfb-expansion -- --league=sec
 *   npm run test-cfb-expansion -- --league=big-12
 */
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import {
  resolveConferenceSpec,
  volumeWithinTolerance,
} from "./lib/conferences";
import {
  countMissingOfficials,
  validateExtractedGames,
} from "./lib/contract";
import { dryRunConferenceIngest } from "./lib/dry-run-ingest";

type DeployCheckRow = {
  conference: string;
  ingested: number;
  passedValidation: number;
  missingOfficials: number;
  volumeOk: boolean;
  contractTestsOk: boolean;
};

function parseLeagueSlug(argv: string[]): string {
  for (const arg of argv) {
    if (arg.startsWith("--league=")) {
      return arg.slice("--league=".length);
    }
    if (arg === "--league") {
      const next = argv[argv.indexOf(arg) + 1];
      if (next) return next;
    }
  }

  const positional = argv.find((arg) => !arg.startsWith("-"));
  if (positional) return positional;

  throw new Error(
    "Missing conference slug. Example: npm run test-cfb-expansion -- --league=big-12",
  );
}

function runContractTests(): boolean {
  const testFile = path.join(__dirname, "lib", "contract.test.ts");
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", testFile],
    { stdio: "inherit" },
  );
  return result.status === 0;
}

function formatTable(rows: DeployCheckRow[]): string {
  const headers = [
    "Conference",
    "Ingested",
    "Passed Validation",
    "Missing Officials",
    "Volume OK",
    "Contract Tests",
  ];

  const data = rows.map((row) => [
    row.conference,
    String(row.ingested),
    String(row.passedValidation),
    String(row.missingOfficials),
    row.volumeOk ? "yes" : "no",
    row.contractTestsOk ? "yes" : "no",
  ]);

  const widths = headers.map((header, index) =>
    Math.max(header.length, ...data.map((row) => row[index]!.length)),
  );

  const pad = (value: string, width: number) => value.padEnd(width);

  const line = (cells: string[]) =>
    cells.map((cell, index) => pad(cell, widths[index]!)).join("  ");

  return [line(headers), line(widths.map((w) => "-".repeat(w))), ...data.map(line)].join(
    "\n",
  );
}

function main() {
  const slug = parseLeagueSlug(process.argv.slice(2));
  const spec = resolveConferenceSpec(slug);

  console.log(`CFB deployment check (dry run) — ${spec.label} [${spec.slug}]\n`);

  console.log("Running contract tests…");
  const contractTestsOk = runContractTests();
  if (!contractTestsOk) {
    console.error("\nContract tests failed.");
    process.exit(1);
  }
  console.log("Contract tests passed.\n");

  console.log("Running dry-run ingest…");
  const ingest = dryRunConferenceIngest(spec.slug);
  const validation = validateExtractedGames(ingest.games);
  const ingested = ingest.ingestedCount ?? ingest.games.length;
  const expected = ingest.expectedGames ?? spec.expectedGames;
  const missingOfficials = countMissingOfficials(ingest.games);
  const volumeOk = volumeWithinTolerance(ingested, expected);

  const row: DeployCheckRow = {
    conference: spec.label,
    ingested,
    passedValidation: validation.passed,
    missingOfficials,
    volumeOk,
    contractTestsOk,
  };

  console.log(formatTable([row]));
  console.log("");
  console.log(`Expected volume: ${expected} (±10% → ${Math.round(expected * 0.9)}–${Math.round(expected * 1.1)})`);
  console.log(`Sample records validated: ${ingest.games.length}`);

  if (validation.failed > 0) {
    console.error("\nValidation failures:");
    for (const issue of validation.issues.slice(0, 8)) {
      console.error(`  • ${issue.gameId} [${issue.field}]: ${issue.message}`);
    }
    if (validation.issues.length > 8) {
      console.error(`  … and ${validation.issues.length - 8} more`);
    }
  }

  const gateOpen = contractTestsOk && volumeOk && validation.failed === 0;

  if (!gateOpen) {
    console.error("\n✗ Deployment check FAILED — do not merge this conference yet.");
    process.exit(1);
  }

  console.log("\n✓ Deployment check passed — conference ready for merge review.");
}

main();
