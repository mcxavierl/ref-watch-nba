#!/usr/bin/env npx tsx
/**
 * CFB ingest sanity monitor — categorizes ingest errors and alerts on schema drift.
 *
 * Reads logs/errors/cfb-ingest.json, groups failures by conference + error type,
 * and warns when Schema Mismatch errors exceed 5% of ingested games for a conference.
 */
import {
  analyzeCfbIngestHealth,
  CFB_INGEST_ERROR_LOG,
  formatIngestHealthReport,
  loadCfbIngestLog,
} from "./lib/ingest-health";

function main() {
  console.log("CFB ingest health check…\n");

  let log;
  try {
    log = loadCfbIngestLog();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    console.error(
      `\nExpected ingest error log at ${CFB_INGEST_ERROR_LOG}. ` +
        "Run the CFB ingest pipeline first or verify the log path.",
    );
    process.exit(1);
  }

  const report = analyzeCfbIngestHealth(log);
  console.log(formatIngestHealthReport(report));

  if (!report.healthy) {
    process.exit(1);
  }

  console.log("\nCFB ingest health check passed.");
}

main();
