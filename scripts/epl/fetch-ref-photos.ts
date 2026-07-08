#!/usr/bin/env npx tsx
/**
 * Fetches Premier League referee headshots from Wikipedia + curated URLs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { refSlug } from "../lib/slug";
import type { RefStatsFile } from "../../src/lib/types";
import {
  sleep,
  titleMatchesOfficial,
  wikiPageImages,
  wikiSearchTitle,
} from "../lib/wiki-photos";

const OUT_PATH = path.join(process.cwd(), "data", "epl", "ref-photos.json");
const STATS_PATH = path.join(process.cwd(), "data", "epl", "ref-stats.json");

const CURATED_BY_NAME: Record<
  string,
  { wikiTitle: string; thumbUrl: string; headshotUrl: string }
> = {
  "Michael Oliver": {
    wikiTitle: "Michael Oliver (referee)",
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Michael_Oliver_%28referee%29_2018.jpg/250px-Michael_Oliver_%28referee%29_2018.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4d/Michael_Oliver_%28referee%29_2018.jpg",
  },
  "Anthony Taylor": {
    wikiTitle: "Anthony Taylor (referee)",
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Anthony_Taylor_%28referee%29.jpg/250px-Anthony_Taylor_%28referee%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/5a/Anthony_Taylor_%28referee%29.jpg",
  },
  "Martin Atkinson": {
    wikiTitle: "Martin Atkinson",
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Martin_Atkinson_%28cropped%29.jpg/250px-Martin_Atkinson_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8e/Martin_Atkinson_%28cropped%29.jpg",
  },
  "Howard Webb": {
    wikiTitle: "Howard Webb",
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Howard_Webb_2010.jpg/250px-Howard_Webb_2010.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/1a/Howard_Webb_2010.jpg",
  },
};

async function resolveWikiTitle(name: string): Promise<string | null> {
  const curated = CURATED_BY_NAME[name];
  if (curated) return curated.wikiTitle;

  for (const query of [`${name} referee`, `${name} football referee`, name]) {
    const title = await wikiSearchTitle(query);
    if (title && titleMatchesOfficial(name, title)) return title;
    await sleep(100);
  }
  return null;
}

async function fetchPhotoForOfficial(
  name: string,
  number: number,
): Promise<{
  slug: string;
  entry: { thumbUrl: string; headshotUrl?: string; source: string };
} | null> {
  const slug = refSlug(name, number);
  const curated = CURATED_BY_NAME[name];
  if (curated) {
    return {
      slug,
      entry: {
        thumbUrl: curated.thumbUrl,
        headshotUrl: curated.headshotUrl,
        source: `curated:wikipedia:${curated.wikiTitle}`,
      },
    };
  }

  const title = await resolveWikiTitle(name);
  if (!title) return null;
  const images = await wikiPageImages(title);
  if (!images) return null;
  return { slug, entry: { ...images, source: `wikipedia:${title}` } };
}

async function main(): Promise<void> {
  if (!fs.existsSync(STATS_PATH)) {
    console.error("Run npm run generate-epl-seed first");
    process.exit(1);
  }
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const photos: Record<string, { thumbUrl: string; headshotUrl?: string; source?: string }> =
    {};
  let found = 0;
  let missed = 0;

  for (const ref of stats.refs) {
    try {
      const result = await fetchPhotoForOfficial(ref.name, ref.number);
      if (result) {
        photos[result.slug] = result.entry;
        found++;
        console.log(`  ✓ ${ref.name}`);
      } else {
        missed++;
        console.log(`  – ${ref.name}`);
      }
    } catch (err) {
      missed++;
      console.warn(`  ! ${ref.name}: ${err}`);
    }
    await sleep(150);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUT_PATH,
    `${JSON.stringify(
      {
        meta: {
          lastUpdated: new Date().toISOString(),
          source: "wikipedia+curated",
          count: found,
          missed,
        },
        photos,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`\nWrote ${found} EPL photos (${missed} missed)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
