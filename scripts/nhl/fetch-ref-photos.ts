#!/usr/bin/env npx tsx
/**
 * NHL official headshots from records.nhl.com (active + historical).
 * Maps onto ref-stats slugs by sweater number when possible, else by name.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { refSlug } from "../lib/slug";
import type { RefStatsFile } from "../../src/lib/types";
import {
  sleep,
  titleMatchesSportOfficial,
  wikiPageImages,
  wikiSearchTitles,
} from "../lib/wiki-photos";

interface NhlOfficialRecord {
  firstName: string;
  lastName: string;
  sweaterNumber: number;
  officialType: string;
  active?: boolean;
  thumb_url?: string;
  headshot_url?: string;
}

type PhotoEntry = {
  thumbUrl: string;
  headshotUrl?: string;
  source?: string;
  matchedName?: string;
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/[-']/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse "Thomas John Luxmore" ↔ "T.J. Luxmore" style variants. */
function nameKeys(name: string): string[] {
  const n = normalizeName(name);
  const keys = new Set<string>([n]);
  const parts = n.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    keys.add(`${parts[0]} ${parts[parts.length - 1]}`);
    keys.add(`${parts[parts.length - 1]}`);
    if (parts.length >= 3) {
      const initials = parts
        .slice(0, -1)
        .map((p) => p[0])
        .join("");
      keys.add(`${initials} ${parts[parts.length - 1]}`);
      keys.add(`${parts[0][0]}${parts[1][0]} ${parts[parts.length - 1]}`);
    }
  }
  return [...keys];
}

async function wikiPhotoForNhl(name: string): Promise<PhotoEntry | null> {
  for (const query of [
    `${name} (ice hockey)`,
    `${name} NHL referee`,
    `${name} hockey referee`,
    `${name} ice hockey official`,
  ]) {
    const hits = await wikiSearchTitles(query);
    for (const title of hits) {
      if (!titleMatchesSportOfficial(name, title, "nhl")) continue;
      const images = await wikiPageImages(title);
      if (images) {
        return { ...images, source: `wikipedia:${title}`, matchedName: name };
      }
      await sleep(60);
    }
    await sleep(80);
  }
  return null;
}

async function main(): Promise<void> {
  const statsPath = path.join(process.cwd(), "data/nhl/ref-stats.json");
  const stats = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;

  const res = await fetch("https://records.nhl.com/site/api/officials");
  if (!res.ok) throw new Error(`Officials API ${res.status}`);
  const body = (await res.json()) as { data: NhlOfficialRecord[] };

  const byName = new Map<string, NhlOfficialRecord[]>();
  for (const official of body.data) {
    if (!official.thumb_url) continue;
    const name = `${official.firstName} ${official.lastName}`;
    for (const key of nameKeys(name)) {
      const list = byName.get(key) ?? [];
      list.push(official);
      byName.set(key, list);
    }
  }

  const photos: Record<string, PhotoEntry> = {};
  let fromNhl = 0;
  let fromWiki = 0;
  let missed = 0;

  for (const ref of stats.refs) {
    let matched: NhlOfficialRecord | undefined;

    // Prefer exact sweater match among name candidates.
    const candidates: NhlOfficialRecord[] = [];
    for (const key of nameKeys(ref.name)) {
      for (const o of byName.get(key) ?? []) candidates.push(o);
    }
    const unique = [...new Map(candidates.map((o) => [`${o.firstName}|${o.lastName}|${o.sweaterNumber}`, o])).values()];
    matched =
      unique.find((o) => o.sweaterNumber === ref.number && ref.number > 0) ??
      unique.find((o) => o.active) ??
      unique[0];

    if (matched?.thumb_url) {
      photos[ref.slug] = {
        thumbUrl: matched.thumb_url,
        headshotUrl: matched.headshot_url,
        source: "records.nhl.com",
        matchedName: `${matched.firstName} ${matched.lastName}`,
      };
      fromNhl++;
      continue;
    }

    // Also try API slug form in case sweater numbers align.
    const apiSlug = refSlug(
      `${matched?.firstName ?? ""} ${matched?.lastName ?? ""}`.trim() || ref.name,
      matched?.sweaterNumber ?? ref.number,
    );
    if (matched?.thumb_url && apiSlug === ref.slug) {
      photos[ref.slug] = {
        thumbUrl: matched.thumb_url,
        headshotUrl: matched.headshot_url,
        source: "records.nhl.com",
      };
      fromNhl++;
      continue;
    }

    try {
      const wiki = await wikiPhotoForNhl(ref.name);
      if (wiki) {
        photos[ref.slug] = wiki;
        fromWiki++;
        console.log(`  wiki ✓ ${ref.name}`);
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

  const outPath = path.join(process.cwd(), "data/nhl/ref-photos.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        meta: {
          lastUpdated: new Date().toISOString(),
          source: "records.nhl.com + wikipedia fallback",
          count: Object.keys(photos).length,
          fromNhl,
          fromWiki,
          missed,
          apiOfficialsWithThumb: body.data.filter((o) => o.thumb_url).length,
        },
        photos,
      },
      null,
      2,
    ),
  );

  console.log(
    `Wrote ${Object.keys(photos).length}/${stats.refs.length} NHL ref photos (nhl=${fromNhl}, wiki=${fromWiki}, missed=${missed}) → ${outPath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
