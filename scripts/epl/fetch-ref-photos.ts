#!/usr/bin/env npx tsx
/**
 * Fetches Premier League referee headshots from Wikipedia + curated URLs.
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

const OUT_PATH = path.join(process.cwd(), "data", "epl", "ref-photos.json");
const STATS_PATH = path.join(process.cwd(), "data", "epl", "ref-stats.json");

const CURATED_BY_NAME: Record<string, string> = {
  "Michael Oliver": "Michael Oliver (referee)",
  "Anthony Taylor": "Anthony Taylor (referee)",
  "Martin Atkinson": "Martin Atkinson",
  "Howard Webb": "Howard Webb",
  "Mark Clattenburg": "Mark Clattenburg",
  "Mike Dean": "Mike Dean (referee)",
  "Jonathan Moss": "Jonathan Moss (referee)",
  "Kevin Friend": "Kevin Friend",
  "Lee Mason": "Lee Mason",
  "Graham Scott": "Graham Scott (referee)",
};

const KNOWN_TITLES: Record<string, string> = {
  "Andy Madley": "Andy Madley",
  "Jarred Gillett": "Jarred Gillett",
  "Sam Barrott": "Sam Barrott",
  "Tom Bramall": "Tom Bramall",
  "Tony Harrington": "Tony Harrington",
  "Darren Bond": "Darren Bond",
  "Robert Jones": "Robert Jones (referee)",
  "Paul Tierney": "Paul Tierney (referee)",
  "Chris Kavanagh": "Chris Kavanagh",
  "Stuart Attwell": "Stuart Attwell",
  "David Coote": "David Coote",
  "John Brooks": "John Brooks (referee)",
  "Peter Bankes": "Peter Bankes",
  "Simon Hooper": "Simon Hooper",
  "Michael Salisbury": "Michael Salisbury",
  "Tim Robinson": "Tim Robinson (referee)",
  "Craig Pawson": "Craig Pawson",
  "Darren England": "Darren England",
  "Thomas Bramall": "Tom Bramall",
};

async function resolveWikiTitle(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<string | null> {
  if (CURATED_BY_NAME[name]) return CURATED_BY_NAME[name];
  if (KNOWN_TITLES[name]) return KNOWN_TITLES[name];
  const indexed = categoryIndex.get(name.toLowerCase());
  if (indexed) return indexed;

  for (const query of [
    `${name} (referee)`,
    `${name} football referee`,
    `${name} Premier League referee`,
    `${name} referee`,
  ]) {
    const hits = await wikiSearchTitles(query);
    for (const title of hits) {
      if (!titleMatchesSportOfficial(name, title, "epl")) continue;
      if (categoryIndex.has(title.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase())) {
        return title;
      }
      if (await isSportOfficialPage(title, "epl")) return title;
      if (title.toLowerCase() === `${name.toLowerCase()} (referee)`) return title;
    }
    await sleep(100);
  }
  return null;
}

async function fetchPhotoForOfficial(
  name: string,
  number: number,
  categoryIndex: Map<string, string>,
): Promise<{
  slug: string;
  entry: { thumbUrl: string; headshotUrl?: string; source: string };
} | null> {
  const slug = refSlug(name, number);
  const title = await resolveWikiTitle(name, categoryIndex);
  if (!title) return null;
  const images = await wikiPageImages(title);
  if (!images) return null;
  return {
    slug,
    entry: {
      ...images,
      source: CURATED_BY_NAME[name]
        ? `curated:wikipedia:${title}`
        : `wikipedia:${title}`,
    },
  };
}

async function main(): Promise<void> {
  if (!fs.existsSync(STATS_PATH)) {
    console.error("Missing data/epl/ref-stats.json");
    process.exit(1);
  }
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  console.log("Loading Premier League referee categories…");
  const pl = await loadCategoryTitleIndex("Category:Premier League referees");
  const eng = await loadCategoryTitleIndex("Category:English football referees");
  const categoryIndex = new Map([...eng, ...pl]);
  console.log(`  ${categoryIndex.size} Wikipedia pages indexed`);

  const photos: Record<
    string,
    { thumbUrl: string; headshotUrl?: string; source?: string }
  > = {};
  let found = 0;
  let missed = 0;

  for (const ref of stats.refs) {
    try {
      const result = await fetchPhotoForOfficial(
        ref.name,
        ref.number,
        categoryIndex,
      );
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
    JSON.stringify(
      {
        meta: {
          lastUpdated: new Date().toISOString(),
          source: "wikipedia categories + curated",
          count: found,
          missed,
        },
        photos,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${found} EPL ref photos (${missed} missed) → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
