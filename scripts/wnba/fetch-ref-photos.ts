#!/usr/bin/env npx tsx
/**
 * WNBA referee headshots from Wikipedia + Wikimedia Commons.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefStatsFile } from "../../src/lib/types";
import {
  commonsPhotoForBasketballOfficial,
  isSportOfficialPage,
  loadCategoryTitleIndex,
  lookupCategoryTitle,
  sleep,
  titleMatchesSportOfficial,
  wikiPageImages,
  wikiSearchTitles,
} from "../lib/wiki-photos";

const OUT_PATH = path.join(process.cwd(), "data", "wnba", "ref-photos.json");
const STATS_PATH = path.join(process.cwd(), "data", "wnba", "ref-stats.json");

type PhotoEntry = {
  thumbUrl: string;
  headshotUrl?: string;
  source?: string;
};

const PREFERRED_TITLES: Record<string, string> = {
  "Amy Bonner": "Amy Bonner",
  "Lauren Holtkamp": "Lauren Holtkamp",
  "Ashley Moyer-Gleich": "Ashley Moyer-Gleich",
  "Monty McCutchen": "Monty McCutchen",
  "Che Flores": "Che Flores (basketball)",
};

async function resolveWikiTitle(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<string | null> {
  const indexed = lookupCategoryTitle(name, categoryIndex, "nba");
  if (indexed) return indexed;

  if (PREFERRED_TITLES[name]) return PREFERRED_TITLES[name];

  for (const query of [
    `${name} (basketball)`,
    `${name} WNBA referee`,
    `${name} basketball referee`,
    `${name} WNBA official`,
    name,
  ]) {
    const hits = await wikiSearchTitles(query);
    for (const title of hits) {
      if (!titleMatchesSportOfficial(name, title, "nba")) continue;
      if (await isSportOfficialPage(title, "nba")) return title;
      if (title.toLowerCase().includes("wnba")) return title;
    }
    await sleep(80);
  }
  return null;
}

async function fetchPhotoForOfficial(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<PhotoEntry | null> {
  const curatedTitle =
    PREFERRED_TITLES[name] ?? lookupCategoryTitle(name, categoryIndex, "nba");
  if (curatedTitle) {
    const images = await wikiPageImages(curatedTitle);
    if (images) {
      return {
        ...images,
        source: PREFERRED_TITLES[name]
          ? `curated:wikipedia:${curatedTitle}`
          : `wikipedia:${curatedTitle}`,
      };
    }
  }

  const title = await resolveWikiTitle(name, categoryIndex);
  if (title && title !== curatedTitle) {
    const officialPage = await isSportOfficialPage(title, "nba");
    if (officialPage) {
      const images = await wikiPageImages(title);
      if (images) {
        return {
          ...images,
          source: `wikipedia:${title}`,
        };
      }
    }
  }

  const commons = await commonsPhotoForBasketballOfficial(name);
  if (commons) return commons;

  return null;
}

function isValidPhotoEntry(name: string, entry: PhotoEntry): boolean {
  const source = (entry.source ?? "").toLowerCase();
  const url = `${entry.thumbUrl ?? ""} ${entry.headshotUrl ?? ""}`.toLowerCase();
  if (source.includes("american football") || url.includes("american_football")) return false;
  if (source.includes("(musician)") || url.includes("musician")) return false;
  if (
    (source.includes("official photo") || url.includes("official_photo")) &&
    !/(basketball|nba|referee|wnba)/.test(`${source} ${url}`)
  ) {
    return false;
  }
  return true;
}

async function main(): Promise<void> {
  if (!fs.existsSync(STATS_PATH)) {
    console.error("Missing data/wnba/ref-stats.json");
    process.exit(1);
  }
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const existing = fs.existsSync(OUT_PATH)
    ? (JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as { photos?: Record<string, PhotoEntry> })
    : { photos: {} };

  console.log("Loading Category:WNBA referees…");
  const categoryIndex = await loadCategoryTitleIndex("Category:WNBA referees");
  console.log(`  ${categoryIndex.size} Wikipedia pages indexed`);

  const photos: Record<string, PhotoEntry> = {};
  for (const [slug, entry] of Object.entries(existing.photos ?? {})) {
    const ref = stats.refs.find((row) => row.slug === slug);
    if (ref && isValidPhotoEntry(ref.name, entry)) {
      photos[slug] = entry;
    }
  }
  let found = 0;
  let missed = 0;
  let newlyFound = 0;

  const refs = [...stats.refs].sort((a, b) => b.games - a.games);

  for (const ref of refs) {
    if (photos[ref.slug]) {
      found++;
      continue;
    }
    try {
      const entry = await fetchPhotoForOfficial(ref.name, categoryIndex);
      if (entry && isValidPhotoEntry(ref.name, entry)) {
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
          source: "wikipedia Category:WNBA referees + commons",
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
  console.log(`Wrote ${found} WNBA ref photos (${newlyFound} new, ${missed} missed) → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
