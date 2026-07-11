#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { buildCrossLeagueOverview } from "../src/lib/cross-league-overview";
import { catalogCompetitionCount } from "../src/lib/league-catalog";

const root = process.cwd();
const dest = path.join(root, "data", "overview-snapshot.json");

const snapshot = buildCrossLeagueOverview(catalogCompetitionCount());
const payload = {
  generatedAt: new Date().toISOString(),
  snapshot,
};

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, `${JSON.stringify(payload)}\n`);

const refCount = snapshot.allRefs.length;
const insightCount = snapshot.insightCards.length;
console.log(
  `Wrote ${dest} (${refCount} refs, ${insightCount} insights, ${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`,
);
