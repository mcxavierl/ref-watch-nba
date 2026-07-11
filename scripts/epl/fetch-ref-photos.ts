#!/usr/bin/env npx tsx
/**
 * Fetches Premier League referee headshots from Wikipedia + Wikimedia Commons.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { refSlug } from "../lib/slug";
import type { RefStatsFile } from "../../src/lib/types";
import {
  commonsPhotoForEplOfficial,
  isSportOfficialPage,
  loadCategoryTitleIndex,
  lookupCategoryTitle,
  resolveOfficialDisplayName,
  sleep,
  titleMatchesSportOfficial,
  wikiPageImages,
  wikiSearchTitles,
} from "../lib/wiki-photos";

const OUT_PATH = path.join(process.cwd(), "data", "epl", "ref-photos.json");
const STATS_PATH = path.join(process.cwd(), "data", "epl", "ref-stats.json");

/** Prefer disambiguated Wikipedia titles with infobox / match photos. */
const PREFERRED_TITLES: Record<string, string> = {
  "Michael Oliver": "Michael Oliver (referee)",
  "Anthony Taylor": "Anthony Taylor (referee)",
  "Mike Dean": "Mike Dean (referee)",
  "Jonathan Moss": "Jonathan Moss (referee)",
  "Graham Scott": "Graham Scott (referee)",
  "Chris Kavanagh": "Chris Kavanagh (referee)",
  "Paul Tierney": "Paul Tierney (referee)",
  "Robert Jones": "Robert Jones (referee)",
  "John Brooks": "John Brooks (referee)",
  "Tim Robinson": "Tim Robinson (referee)",
  "Thomas Bramall": "Tom Bramall",
  "Jarred Gillett": "Jarred Gillett (referee)",
  "Lee Mason": "Lee Mason (referee)",
  "Sam Barrott": "Sam Barrott (referee)",
  "Tony Harrington": "Tony Harrington (referee)",
  "Roger East": "Roger East (referee)",
  "David Webb": "David Webb (referee)",
  "Oliver Langford": "Oliver Langford (referee)",
  "Darren Bond": "Darren Bond (referee)",
};

async function resolveWikiTitle(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<string | null> {
  const indexed = lookupCategoryTitle(name, categoryIndex, "epl");
  if (indexed) return indexed;

  if (PREFERRED_TITLES[name]) return PREFERRED_TITLES[name];

  const resolved = resolveOfficialDisplayName(name, "epl");
  if (resolved !== name) {
    const aliasIndexed = lookupCategoryTitle(resolved, categoryIndex, "epl");
    if (aliasIndexed) return aliasIndexed;
    if (PREFERRED_TITLES[resolved]) return PREFERRED_TITLES[resolved];
  }

  for (const query of [
    `${resolved} (referee)`,
    `${name} (referee)`,
    `${resolved} football referee`,
    `${resolved} Premier League referee`,
    `${resolved} referee`,
  ]) {
    const hits = await wikiSearchTitles(query);
    for (const title of hits) {
      if (!titleMatchesSportOfficial(resolved, title, "epl")) continue;
      if (await isSportOfficialPage(title, "epl")) return title;
      if (title.toLowerCase() === `${resolved.toLowerCase()} (referee)`) return title;
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
  if (title) {
    const images = await wikiPageImages(title);
    if (images) {
      return {
        slug,
        entry: {
          ...images,
          source: PREFERRED_TITLES[name]
            ? `curated:wikipedia:${title}`
            : `wikipedia:${title}`,
        },
      };
    }
  }

  const commons = await commonsPhotoForEplOfficial(name);
  if (commons) return { slug, entry: commons };

  return null;
}

async function main(): Promise<void> {
  if (!fs.existsSync(STATS_PATH)) {
    console.error("Missing data/epl/ref-stats.json");
    process.exit(1);
  }
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const existing = fs.existsSync(OUT_PATH)
    ? (JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as {
        photos?: Record<string, { thumbUrl: string; headshotUrl?: string; source?: string }>;
      })
    : { photos: {} };

  console.log("Loading Premier League referee categories…");
  const pl = await loadCategoryTitleIndex("Category:Premier League referees");
  const eng = await loadCategoryTitleIndex("Category:English football referees");
  const fifa = await loadCategoryTitleIndex("Category:FIFA international referees");
  const categoryIndex = new Map([...fifa, ...eng, ...pl]);
  console.log(`  ${categoryIndex.size} Wikipedia pages indexed`);

  const photos: Record<
    string,
    { thumbUrl: string; headshotUrl?: string; source?: string }
  > = { ...(existing.photos ?? {}) };
  let found = 0;
  let newlyFound = 0;
  let missed = 0;

  for (const ref of stats.refs) {
    const slug = refSlug(ref.name, ref.number);
    if (photos[slug]) {
      found++;
      continue;
    }
    // Skip abbreviated crew placeholders (e.g. "A Moss", "K Kavanagh") — no reliable image match.
    if (/^[A-Z]\s+[A-Z]/i.test(ref.name) || ref.name.split(/\s+/).some((p) => p.length === 1)) {
      missed++;
      console.log(`  – ${ref.name} (abbreviated name)`);
      continue;
    }
    try {
      const result = await fetchPhotoForOfficial(
        ref.name,
        ref.number,
        categoryIndex,
      );
      if (result) {
        photos[result.slug] = result.entry;
        found++;
        newlyFound++;
        console.log(`  ✓ ${ref.name} (${result.entry.source})`);
      } else {
        missed++;
        console.log(`  – ${ref.name}`);
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
          source: "wikipedia categories + commons + curated",
          count: found,
          missed,
          newlyResolved: newlyFound,
        },
        photos,
      },
      null,
      2,
    ),
  );
  console.log(
    `Wrote ${found} EPL ref photos (${newlyFound} new, ${missed} missed) → ${OUT_PATH}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
