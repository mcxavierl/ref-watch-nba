/**
 * Post-ingest hook: regenerate overview + top-stories insights from latest ref-stats.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { generateOverviewInsightsPayload } from "../../src/lib/insights/generator";

const ROOT = process.cwd();

export type OverviewWriteResult = {
  dataPath: string;
  publicPath: string;
  leagueCards: number;
  topStories: number;
  topStoriesStatus: "generated" | "fallback";
};

export function writeOverviewInsightsArtifacts(): OverviewWriteResult {
  const payload = generateOverviewInsightsPayload();
  const dataDir = path.join(ROOT, "data");
  const publicDir = path.join(ROOT, "public", "data");

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  const dataPath = path.join(dataDir, "overview-insights.json");
  const publicPath = path.join(publicDir, "insights.json");

  const body = `${JSON.stringify(payload)}\n`;
  fs.writeFileSync(dataPath, body);
  fs.writeFileSync(publicPath, body);

  return {
    dataPath,
    publicPath,
    leagueCards: payload.cards.length,
    topStories: payload.topStories.length,
    topStoriesStatus: payload.topStoriesStatus,
  };
}

export function runPostIngestInsightGenerator(): OverviewWriteResult {
  const result = writeOverviewInsightsArtifacts();
  console.log(
    `Insights: ${result.leagueCards} league cards, ${result.topStories} top stories (${result.topStoriesStatus})`,
  );
  console.log(`Wrote ${result.dataPath}`);
  console.log(`Wrote ${result.publicPath}`);
  return result;
}
