/**
 * Post-ingest hook: regenerate overview + top-stories insights from latest ref-stats.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { buildOverviewInsightsPayload } from "./insights-build";
import type { OverviewInsightsPayload } from "../../src/lib/insights/generator-core";

export type OverviewWriteResult = {
  dataPath: string;
  publicPath: string;
  leagueCards: number;
  topStories: number;
  topStoriesStatus: "generated" | "fallback";
};

export type PostIngestInsightOptions = {
  force?: boolean;
};

export async function writeOverviewInsightsArtifacts(
  options: PostIngestInsightOptions = {},
): Promise<OverviewWriteResult> {
  const payload: OverviewInsightsPayload = await buildOverviewInsightsPayload({
    force: options.force,
  });
  const root = process.env.INSIGHTS_BUILD_ROOT ?? process.cwd();
  const dataDir = path.join(root, "data");
  const publicDir = path.join(root, "public", "data");

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

export async function runPostIngestInsightGenerator(
  options: PostIngestInsightOptions = {},
): Promise<OverviewWriteResult> {
  const result = await writeOverviewInsightsArtifacts(options);
  console.log(
    `Insights: ${result.leagueCards} league cards, ${result.topStories} top stories (${result.topStoriesStatus})`,
  );
  console.log(`Wrote ${result.dataPath}`);
  console.log(`Wrote ${result.publicPath}`);
  return result;
}
