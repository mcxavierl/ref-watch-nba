#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { refSlug } from "../lib/slug";

interface NhlOfficialRecord {
  firstName: string;
  lastName: string;
  sweaterNumber: number;
  officialType: string;
  thumb_url?: string;
  headshot_url?: string;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

async function main(): Promise<void> {
  const res = await fetch(
    "https://records.nhl.com/site/api/officials?cayenneExp=active=true",
  );
  if (!res.ok) {
    throw new Error(`Officials API ${res.status}`);
  }

  const body = (await res.json()) as { data: NhlOfficialRecord[] };
  const photos: Record<string, { thumbUrl: string; headshotUrl?: string }> = {};
  let skipped = 0;

  for (const official of body.data) {
    if (!official.thumb_url) {
      skipped++;
      continue;
    }
    const name = `${official.firstName} ${official.lastName}`;
    const slug = refSlug(name, official.sweaterNumber);
    photos[slug] = {
      thumbUrl: official.thumb_url,
      headshotUrl: official.headshot_url,
    };
  }

  const outPath = path.join(process.cwd(), "data/nhl/ref-photos.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        meta: {
          lastUpdated: new Date().toISOString(),
          source: "records.nhl.com",
          count: Object.keys(photos).length,
          skipped,
        },
        photos,
      },
      null,
      2,
    ),
  );

  console.log(
    `Wrote ${Object.keys(photos).length} NHL ref photos (${skipped} without thumb) → ${outPath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
