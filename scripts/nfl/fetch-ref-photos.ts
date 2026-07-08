#!/usr/bin/env npx tsx
/**
 * Fetches NFL official headshots from Wikipedia + Wikimedia Commons (best-effort).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { refSlug } from "../lib/slug";
import type { RefStatsFile } from "../../src/lib/types";
import {
  commonsPhotoFromNflOfficialsFiles,
  commonsPhotoFromOfficialCategory,
  isNflOfficialPage,
  loadNflOfficialTitleIndex,
  sleep,
  titleMatchesOfficial,
  wikiPageImages,
  wikiSearchTitles,
} from "../lib/wiki-photos";

const OUT_PATH = path.join(process.cwd(), "data", "nfl", "ref-photos.json");
const STATS_PATH = path.join(process.cwd(), "data", "nfl", "ref-stats.json");

type PhotoEntry = {
  thumbUrl: string;
  headshotUrl?: string;
  source?: string;
};

/** Hand-verified Wikimedia URLs for high-profile refs. */
const CURATED_BY_NAME: Record<string, PhotoEntry> = {
  "Carl Cheffers": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Carl_Cheffers_%282019%29.jpg/250px-Carl_Cheffers_%282019%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fd/Carl_Cheffers_%282019%29.jpg",
    source: "curated:commons:Carl Cheffers (2019).jpg",
  },
  "Shawn Hochuli": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Shawn_Hochuli.jpg/250px-Shawn_Hochuli.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/9b/Shawn_Hochuli.jpg",
    source: "curated:commons:Shawn Hochuli.jpg",
  },
  "Bill Vinovich": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Bill_Vinovich_%2851738962949%29_%28cropped%29.jpg/250px-Bill_Vinovich_%2851738962949%29_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/9f/Bill_Vinovich_%2851738962949%29_%28cropped%29.jpg",
    source: "curated:wikipedia:Bill Vinovich",
  },
  "Jerome Boger": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Jerome_Boger_in_2006.jpg/250px-Jerome_Boger_in_2006.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/39/Jerome_Boger_in_2006.jpg",
    source: "curated:wikipedia:Jerome Boger",
  },
  "Clete Blakeman": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Clete_Blakeman_at_Super_Bowl_50_%28cropped%29.jpg/250px-Clete_Blakeman_at_Super_Bowl_50_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/f0/Clete_Blakeman_at_Super_Bowl_50_%28cropped%29.jpg",
    source: "curated:wikipedia:Clete Blakeman",
  },
  "Ronald Torbert": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/03_Jan_2021_-_Eagles_WashingtonFootball0067_Ronald_Torbert_%2850808329481%29_%28cropped%29.jpg/250px-03_Jan_2021_-_Eagles_WashingtonFootball0067_Ronald_Torbert_%2850808329481%29_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/df/03_Jan_2021_-_Eagles_WashingtonFootball0067_Ronald_Torbert_%2850808329481%29_%28cropped%29.jpg",
    source: "curated:commons:Ronald Torbert",
  },
  "Brad Allen": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Brad_Allen_%2855091257444%29_%28cropped%29.jpg/250px-Brad_Allen_%2855091257444%29_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/3b/Brad_Allen_%2855091257444%29_%28cropped%29.jpg",
    source: "curated:commons:Brad Allen",
  },
  "John Hussey": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/John_Hussey_%2850696365097%29_%28cropped%29.jpg/250px-John_Hussey_%2850696365097%29_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/f7/John_Hussey_%2850696365097%29_%28cropped%29.jpg",
    source: "curated:wikipedia:John Hussey",
  },
  "Scott Novak": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Scott_Novak_2021_%2850833237927%29_%28cropped%29.jpg/250px-Scott_Novak_2021_%2850833237927%29_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/24/Scott_Novak_2021_%2850833237927%29_%28cropped%29.jpg",
    source: "curated:wikipedia:Scott Novak",
  },
  "Land Clark": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/LandClark-12-31-2023.jpg/250px-LandClark-12-31-2023.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/88/LandClark-12-31-2023.jpg",
    source: "curated:commons:LandClark",
  },
  "Tra Blake": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Tra_Blake_at_Commanders_vs._Jaguars_%28September_11%2C_2022%29.jpg/250px-Tra_Blake_at_Commanders_vs._Jaguars_%28September_11%2C_2022%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8a/Tra_Blake_at_Commanders_vs._Jaguars_%28September_11%2C_2022%29.jpg",
    source: "curated:commons:Tra Blake",
  },
  "Adrian Hill": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Adrian_Hill_at_WFT_vs._Seahawks_2020_%2850743800713%29_%28cropped%29.jpg/250px-Adrian_Hill_at_WFT_vs._Seahawks_2020_%2850743800713%29_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/22/Adrian_Hill_at_WFT_vs._Seahawks_2020_%2850743800713%29_%28cropped%29.jpg",
    source: "curated:commons:Adrian Hill",
  },
  "Alex Kemp": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Alex_Kemp.jpg/250px-Alex_Kemp.jpg",
    headshotUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Alex_Kemp.jpg",
    source: "curated:commons:Alex Kemp.jpg",
  },
  "Craig Wrolstad": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Craig_Wrolstad.jpg/250px-Craig_Wrolstad.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/ee/Craig_Wrolstad.jpg",
    source: "curated:wikipedia:Craig Wrolstad",
  },
  "Clay Martin": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Clay_Martin_at_Falcons-bucs_2019_coin_flip_%28cropped%29.jpg/250px-Clay_Martin_at_Falcons-bucs_2019_coin_flip_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/9c/Clay_Martin_at_Falcons-bucs_2019_coin_flip_%28cropped%29.jpg",
    source: "curated:commons:Clay Martin",
  },
  "Greg Meyer": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Greg_Meyer_%28cropped%29.jpg/250px-Greg_Meyer_%28cropped%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fd/Greg_Meyer_%28cropped%29.jpg",
    source: "curated:wikipedia:Greg Meyer",
  },
  "Brad Rogers": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Brad_Rogers.jpg/250px-Brad_Rogers.jpg",
    headshotUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Brad_Rogers.jpg",
    source: "curated:wikipedia:Brad Rogers",
  },
  "Shawn Smith": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shawn_Smith%2C_Tampa_Bay_Bucs_and_NY_Giants_2018_coin_flip_%28cropped%29_2.jpg/250px-Shawn_Smith%2C_Tampa_Bay_Bucs_and_NY_Giants_2018_coin_flip_%28cropped%29_2.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shawn_Smith%2C_Tampa_Bay_Bucs_and_NY_Giants_2018_coin_flip_%28cropped%29_2.jpg",
    source: "curated:wikipedia:Shawn Smith",
  },
  "Carl Paganelli": {
    thumbUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Super_Bowl_XLVI_%286837551195%29.jpg/250px-Super_Bowl_XLVI_%286837551195%29.jpg",
    headshotUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/7a/Super_Bowl_XLVI_%286837551195%29.jpg",
    source: "curated:commons:Super Bowl XLVI Carl Paganelli",
  },
};

const KNOWN_TITLES: Record<string, string> = {
  "Adrian Hill": "Adrian Hill (American football official)",
  "Alex Kemp": "Alex Kemp (American football official)",
  "Brad Allen": "Brad Allen",
  "Greg Meyer": "Greg Meyer (American football official)",
  "John Hussey": "John Hussey (American football official)",
  "Scott Novak": "Scott Novak",
  "Shawn Smith": "Shawn Smith (American football)",
};

async function resolveFromWikipedia(
  name: string,
  nflTitleIndex: Map<string, string>,
): Promise<PhotoEntry | null> {
  const candidates: string[] = [];

  if (KNOWN_TITLES[name]) candidates.push(KNOWN_TITLES[name]);

  const indexed = nflTitleIndex.get(name.toLowerCase());
  if (indexed) candidates.push(indexed);

  for (const query of [
    `${name} (American football official)`,
    `${name} American football official`,
    `${name} NFL referee`,
  ]) {
    const hits = await wikiSearchTitles(query);
    for (const title of hits) {
      if (titleMatchesOfficial(name, title)) candidates.push(title);
    }
    await sleep(80);
  }

  const seen = new Set<string>();
  for (const title of candidates) {
    if (seen.has(title)) continue;
    seen.add(title);

    const official = await isNflOfficialPage(title);
    if (!official) continue;

    const images = await wikiPageImages(title);
    if (images) {
      return {
        ...images,
        source: `wikipedia:${title}`,
      };
    }
    await sleep(80);
  }

  return null;
}

async function fetchPhotoForOfficial(
  name: string,
  number: number,
  nflTitleIndex: Map<string, string>,
): Promise<{ slug: string; entry: PhotoEntry } | null> {
  const slug = refSlug(name, number);

  if (CURATED_BY_NAME[name]) {
    return { slug, entry: { ...CURATED_BY_NAME[name] } };
  }

  const wiki = await resolveFromWikipedia(name, nflTitleIndex);
  if (wiki) return { slug, entry: wiki };

  const commons = await commonsPhotoFromOfficialCategory(name);
  if (commons) return { slug, entry: commons };

  const nflOfficialsFile = await commonsPhotoFromNflOfficialsFiles(name);
  if (nflOfficialsFile) return { slug, entry: nflOfficialsFile };

  return null;
}

async function main(): Promise<void> {
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const photos: Record<string, PhotoEntry> = {};
  const missed: string[] = [];
  let found = 0;

  console.log("Loading Category:NFL officials index…");
  const nflTitleIndex = await loadNflOfficialTitleIndex();
  console.log(`  ${nflTitleIndex.size} Wikipedia pages indexed`);

  const refs = [...stats.refs].sort((a, b) => b.games - a.games);

  for (const ref of refs) {
    try {
      const result = await fetchPhotoForOfficial(ref.name, ref.number, nflTitleIndex);
      if (result) {
        photos[result.slug] = result.entry;
        found++;
        console.log(`  ✓ ${ref.name} (${result.entry.source ?? "unknown"})`);
      } else {
        missed.push(ref.name);
        console.log(`  – ${ref.name} (no image)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      missed.push(ref.name);
      console.warn(`  ! ${ref.name}: ${message}`);
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
          source: "wikipedia+commons+curated",
          count: found,
          missed: missed.length,
          note: "Verified NFL official headshots; striped badge fallback when missing.",
        },
        photos,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`\nWrote ${found} photos (${missed.length} missed) → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
