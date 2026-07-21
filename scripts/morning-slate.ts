#!/usr/bin/env npx tsx
/**
 * Morning slate refresh (intended ~9:05 AM ET via cron):
 * 1. Fetch referee assignments
 * 2. Fetch sportsbook totals (optional ODDS_API_KEY)
 * 3. Write data/alerts.json for push/webhook consumers
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { getRefStats } from "../src/lib/data";
import { alertsSummary, computeSlateAlerts } from "../src/lib/slate-alerts";
import { runIntegrityMonitorPipeline } from "../src/lib/services/integrityMonitor";
import type { AssignmentsFile } from "../src/lib/types";

const assignmentsPath = path.join(process.cwd(), "data", "assignments.json");
const alertsPath = path.join(process.cwd(), "data", "alerts.json");

function readAssignments(): AssignmentsFile {
  return JSON.parse(fs.readFileSync(assignmentsPath, "utf8")) as AssignmentsFile;
}

async function main() {
  console.log("Morning slate — fetching assignments...");
  execSync("npm run fetch-assignments", { stdio: "inherit" });

  console.log("Morning slate — fetching odds (optional)...");
  try {
    execSync("npm run fetch-odds", { stdio: "inherit" });
  } catch {
    console.warn("Odds fetch failed — continuing with league proxy.");
  }

  const assignments = readAssignments();
  const stats = getRefStats();
  const alerts = computeSlateAlerts(assignments, stats);

  fs.mkdirSync(path.dirname(alertsPath), { recursive: true });
  fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));

  console.log("");
  console.log(alertsSummary(alerts).join("\n"));
  console.log("");

  console.log("Morning slate — running anomaly integrity monitor...");
  const integrity = await runIntegrityMonitorPipeline({ processWebhooks: true });
  console.log(
    `Integrity monitor: ${integrity.monitor.anomaliesDetected} anomalies, ${integrity.webhook.enqueued} webhook jobs enqueued, ${integrity.webhook.dispatch.delivered} delivered.`,
  );

  console.log("");
  console.log(`Wrote ${alertsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
