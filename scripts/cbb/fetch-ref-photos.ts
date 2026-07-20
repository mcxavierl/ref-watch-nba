#!/usr/bin/env npx tsx
/**
 * College basketball referee headshots from Wikipedia + Wikimedia Commons.
 * Prioritizes refs with the largest game samples.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefStatsFile } from "../../src/lib/types";
import {
  isSportOfficialPage,
  loadCategoryTitleIndex,
  lookupCategoryTitle,
  sleep,
  titleMatchesSportOfficial,
  wikiPageImages,
  wikiSearchTitles,
} from "../lib/wiki-photos";

const OUT_PATH = path.join(process.cwd(), "data", "cbb", "ref-photos.json");
const STATS_PATH = path.join(process.cwd(), "data", "cbb", "ref-stats.json");
const MIN_GAMES = Number(process.env.CBB_REF_PHOTO_MIN_GAMES ?? "12");

type PhotoEntry = {
  thumbUrl: string;
  headshotUrl?: string;
  source?: string;
};

function isValidPhotoEntry(name: string, entry: PhotoEntry): boolean {
  const source = (entry.source ?? "").toLowerCase();
  const url = `${entry.thumbUrl ?? ""} ${entry.headshotUrl ?? ""}`.toLowerCase();
  const blob = `${source} ${url}`;
  if (source.includes("(pastor)") || source.includes("(musician)")) return false;
  if (source.includes("american football") || url.includes("american_football")) return false;
  if (/\b(pastor|priest|bishop|senator|governor|congress|ambassador|portrait|vadm|military|marine)\b/.test(blob)) {
    return false;
  }
  if (blob.includes("bill_vinovich") || blob.includes("bill vinovich")) return false;
  if (
    blob.includes("eric_lewis") &&
    !blob.includes("basketball") &&
    !blob.includes("referee")
  ) {
    return false;
  }
  if (
    (source.includes("official photo") || url.includes("official_photo")) &&
    !/(basketball|ncaa|referee|college)/.test(blob)
  ) {
    return false;
  }
  if (source.startsWith("commons:")) {
    if (!/(referee|basketball|ncaa|official)/.test(blob)) return false;
  }
  return true;
}

const PREFERRED_TITLES: Record<string, string> = {
  "Ted Valentine": "Ted Valentine",
  "Mike Eades": "Mike Eades",
  "John Higgins": "John Higgins (basketball)",
};

async function resolveWikiTitle(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<string | null> {
  const indexed = lookupCategoryTitle(name, categoryIndex, "cbb");
  if (indexed) return indexed;

  if (PREFERRED_TITLES[name]) return PREFERRED_TITLES[name];

  for (const query of [
    `${name} (basketball)`,
    `${name} (referee)`,
    `${name} basketball referee`,
    `${name} NCAA referee`,
    name,
  ]) {
    const hits = await wikiSearchTitles(query);
    for (const title of hits) {
      if (!titleMatchesSportOfficial(name, title, "cbb")) continue;
      if (await isSportOfficialPage(title, "cbb")) return title;
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
    PREFERRED_TITLES[name] ?? lookupCategoryTitle(name, categoryIndex, "cbb");
  if (curatedTitle) {
    if (await isSportOfficialPage(curatedTitle, "cbb")) {
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
  }

  const title = await resolveWikiTitle(name, categoryIndex);
  if (title && title !== curatedTitle) {
    if (await isSportOfficialPage(title, "cbb")) {
      const images = await wikiPageImages(title);
      if (images) return { ...images, source: `wikipedia:${title}` };
    }
  }

  return null;
}

async function main(): Promise<void> {
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const existing = fs.existsSync(OUT_PATH)
    ? (JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as { photos?: Record<string, PhotoEntry> })
    : { photos: {} };

  console.log("Loading basketball referee categories…");
  const basketball = await loadCategoryTitleIndex("Category:Basketball referees");
  const nbaRefs = await loadCategoryTitleIndex("Category:NBA referees");
  const categoryIndex = new Map([...basketball, ...nbaRefs]);
  console.log(`  ${categoryIndex.size} Wikipedia pages indexed`);

  const photos: Record<string, PhotoEntry> = {};
  for (const [slug, entry] of Object.entries(existing.photos ?? {})) {
    const ref = stats.refs.find((row) => row.slug === slug);
    if (ref && isValidPhotoEntry(ref.name, entry)) {
      photos[slug] = entry;
    }
  }
  let found = Object.keys(photos).length;
  let missed = 0;
  let newlyFound = 0;

  const refs = [...stats.refs]
    .filter((ref) => ref.games >= MIN_GAMES)
    .sort((a, b) => b.games - a.games);

  console.log(`Fetching photos for ${refs.length} CBB refs with >= ${MIN_GAMES} games…`);

  for (const ref of refs) {
    if (photos[ref.slug]) continue;
    try {
      const entry = await fetchPhotoForOfficial(ref.name, categoryIndex);
      if (entry && isValidPhotoEntry(ref.name, entry)) {
        photos[ref.slug] = entry;
        found++;
        newlyFound++;
        console.log(`  ✓ ${ref.name} (${entry.source ?? "unknown"})`);
      } else {
        if (entry) console.log(`  × ${ref.name} (rejected bad match)`);
        missed++;
      }
    } catch (err) {
      missed++;
      console.warn(`  ! ${ref.name}: ${err}`);
    }
    await sleep(90);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUT_PATH,
    `${JSON.stringify(
      {
        meta: {
          lastUpdated: new Date().toISOString(),
          source: "wikipedia + commons",
          count: found,
          missed,
          newlyResolved: newlyFound,
          minGames: MIN_GAMES,
        },
        photos,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${found} CBB ref photos (${newlyFound} new, ${missed} missed) → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
