#!/usr/bin/env npx tsx
/**
 * College football referee headshots from Wikipedia + Wikimedia Commons.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefStatsFile } from "../../src/lib/types";
import {
  commonsPhotoForName,
  commonsPhotoFromNflOfficialsFiles,
  isNflOfficialPage,
  loadCategoryTitleIndex,
  lookupCategoryTitle,
  sleep,
  titleMatchesSportOfficial,
  wikiPageImages,
  wikiSearchTitles,
} from "../lib/wiki-photos";

const OUT_PATH = path.join(process.cwd(), "data", "cfb", "ref-photos.json");
const STATS_PATH = path.join(process.cwd(), "data", "cfb", "ref-stats.json");

type PhotoEntry = {
  thumbUrl: string;
  headshotUrl?: string;
  source?: string;
};

async function resolveWikiTitle(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<string | null> {
  const indexed = lookupCategoryTitle(name, categoryIndex, "nfl");
  if (indexed) return indexed;

  for (const query of [
    `${name} (American football official)`,
    `${name} college football official`,
    `${name} football official`,
    name,
  ]) {
    const hits = await wikiSearchTitles(query);
    for (const title of hits) {
      if (!titleMatchesSportOfficial(name, title, "nfl")) continue;
      if (await isNflOfficialPage(title)) return title;
    }
    await sleep(80);
  }
  return null;
}

async function fetchPhotoForOfficial(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<PhotoEntry | null> {
  const curatedTitle = lookupCategoryTitle(name, categoryIndex, "nfl");
  if (curatedTitle && (await isNflOfficialPage(curatedTitle))) {
    const images = await wikiPageImages(curatedTitle);
    if (images) {
      return {
        ...images,
        source: `wikipedia:${curatedTitle}`,
      };
    }
  }

  const title = await resolveWikiTitle(name, categoryIndex);
  if (title && title !== curatedTitle && (await isNflOfficialPage(title))) {
    const images = await wikiPageImages(title);
    if (images) {
      return {
        ...images,
        source: `wikipedia:${title}`,
      };
    }
  }

  const fromCategory = await commonsPhotoFromNflOfficialsFiles(name);
  if (fromCategory) return fromCategory;

  const commons = await commonsPhotoForName(name);
  if (commons) return commons;

  return null;
}

function isValidPhotoEntry(entry: PhotoEntry): boolean {
  const source = (entry.source ?? "").toLowerCase();
  const url = `${entry.thumbUrl ?? ""} ${entry.headshotUrl ?? ""}`.toLowerCase();
  if (source.includes("(musician)") || url.includes("musician")) return false;
  if (!/(football|nfl|official|referee|college)/.test(`${source} ${url}`)) return false;
  return true;
}

async function main(): Promise<void> {
  if (!fs.existsSync(STATS_PATH)) {
    console.error("Missing data/cfb/ref-stats.json");
    process.exit(1);
  }
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const existing = fs.existsSync(OUT_PATH)
    ? (JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as { photos?: Record<string, PhotoEntry> })
    : { photos: {} };

  console.log("Loading Category:College football officials…");
  const categoryIndex = await loadCategoryTitleIndex("Category:College football officials");
  console.log(`  ${categoryIndex.size} Wikipedia pages indexed`);

  const photos: Record<string, PhotoEntry> = {};
  for (const [slug, entry] of Object.entries(existing.photos ?? {})) {
    const ref = stats.refs.find((row) => row.slug === slug);
    if (ref && isValidPhotoEntry(entry)) {
      photos[slug] = entry;
    }
  }
  let found = 0;
  let missed = 0;
  let newlyFound = 0;

  const refs = [...stats.refs].sort((a, b) => b.games - a.games);
  if (refs.length === 0) {
    console.log("No CFB refs in ref-stats.json yet; writing empty photo map.");
  }

  for (const ref of refs) {
    if (photos[ref.slug]) {
      found++;
      continue;
    }
    try {
      const entry = await fetchPhotoForOfficial(ref.name, categoryIndex);
      if (entry && isValidPhotoEntry(entry)) {
        photos[ref.slug] = entry;
        found++;
        if (!existing.photos?.[ref.slug]) newlyFound++;
        console.log(`  ✓ ${ref.name} (${entry.source ?? "unknown"})`);
      } else {
        if (entry) console.log(`  × ${ref.name} (rejected bad match)`);
        else console.log(`  – ${ref.name}`);
        missed++;
      }
    } catch (err) {
      missed++;
      console.warn(`  ! ${ref.name}: ${err}`);
    }
    await sleep(100);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUT_PATH,
    `${JSON.stringify(
      {
        meta: {
          lastUpdated: new Date().toISOString(),
          source: "wikipedia Category:College football officials + commons",
          count: found,
          missed,
          newlyResolved: newlyFound,
        },
        photos,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${found} CFB ref photos (${newlyFound} new, ${missed} missed) → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
