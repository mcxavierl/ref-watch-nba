#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import overviewInsightsJson from "../data/overview-insights.json";
import type { LeagueInsightCard } from "../src/lib/league-overview-insights";
import { buildInsightDrilldownPayload } from "./lib/insight-drilldown-builder";

const root = process.cwd();
const cards = (overviewInsightsJson as { cards: LeagueInsightCard[] }).cards ?? [];
const outDir = path.join(root, "public", "data", "overview", "drilldown");
const dataDir = path.join(root, "data", "overview", "drilldown");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

let written = 0;
for (const card of cards) {
  const payload = buildInsightDrilldownPayload(root, card);
  if (!payload) continue;
  const json = `${JSON.stringify(payload)}\n`;
  const filename = `${payload.drilldownId}.json`;
  fs.writeFileSync(path.join(outDir, filename), json);
  fs.writeFileSync(path.join(dataDir, filename), json);
  written += 1;
}

console.log(`Wrote ${written} overview drill-down shards to ${outDir}`);
