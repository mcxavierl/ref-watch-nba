#!/usr/bin/env npx tsx
/**
 * Best-effort NBA referee headshots from Wikipedia Category:NBA referees.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { refSlug } from "../lib/slug";
import type { RefStatsFile } from "../../src/lib/types";
import {
  isSportOfficialPage,
  loadCategoryTitleIndex,
  sleep,
  titleMatchesSportOfficial,
  wikiPageImages,
  wikiSearchTitles,
} from "../lib/wiki-photos";

const OUT_PATH = path.join(process.cwd(), "data", "nba", "ref-photos.json");
const STATS_PATH = path.join(process.cwd(), "data", "ref-stats.json");

function pageBaseName(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
}

async function resolveWikiTitle(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<string | null> {
  const indexed = categoryIndex.get(name.toLowerCase());
  if (indexed) return indexed;

  // Initials / Jr. variants
  for (const [base, title] of categoryIndex) {
    if (base === name.toLowerCase().replace(/\s+jr\.?$/i, "").trim()) {
      return title;
    }
  }

  for (const query of [
    `${name} (basketball)`,
    `${name} NBA referee`,
    `${name} basketball referee`,
  ]) {
    const hits = await wikiSearchTitles(query);
    for (const title of hits) {
      if (!titleMatchesSportOfficial(name, title, "nba")) continue;
      if (categoryIndex.has(pageBaseName(title))) return title;
      if (await isSportOfficialPage(title, "nba")) return title;
    }
    await sleep(80);
  }
  return null;
}

async function main(): Promise<void> {
  if (!fs.existsSync(STATS_PATH)) {
    console.error("Missing data/ref-stats.json");
    process.exit(1);
  }
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  console.log("Loading Category:NBA referees…");
  const categoryIndex = await loadCategoryTitleIndex("Category:NBA referees");
  console.log(`  ${categoryIndex.size} Wikipedia pages indexed`);

  const photos: Record<
    string,
    { thumbUrl: string; headshotUrl?: string; source?: string }
  > = {};
  let found = 0;
  let missed = 0;

  for (const ref of stats.refs) {
    try {
      const title = await resolveWikiTitle(ref.name, categoryIndex);
      if (!title) {
        missed++;
        console.log(`  – ${ref.name}`);
        await sleep(40);
        continue;
      }
      const images = await wikiPageImages(title);
      if (!images) {
        missed++;
        console.log(`  – ${ref.name} (page, no image)`);
      } else {
        photos[ref.slug] = { ...images, source: `wikipedia:${title}` };
        found++;
        console.log(`  ✓ ${ref.name}`);
      }
    } catch (err) {
      missed++;
      console.warn(`  ! ${ref.name}: ${err}`);
    }
    await sleep(120);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        meta: {
          lastUpdated: new Date().toISOString(),
          source: "wikipedia Category:NBA referees",
          count: Object.keys(photos).length,
          found,
          missed,
        },
        photos,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${found} NBA ref photos (${missed} missed) → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
