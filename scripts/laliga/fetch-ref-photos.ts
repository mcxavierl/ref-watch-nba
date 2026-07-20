#!/usr/bin/env npx tsx
/**
 * La Liga referee headshots from Wikipedia + Wikimedia Commons.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefStatsFile } from "../../src/lib/types";
import {
  commonsPhotoForLaLigaOfficial,
  isSportOfficialPage,
  loadCategoryTitleIndex,
  lookupCategoryTitle,
  resolveOfficialDisplayName,
  sleep,
  titleMatchesSportOfficial,
  wikiPageImages,
  wikiPageImagesForLang,
  wikiSearchTitles,
} from "../lib/wiki-photos";

const OUT_PATH = path.join(process.cwd(), "data", "laliga", "ref-photos.json");
const STATS_PATH = path.join(process.cwd(), "data", "laliga", "ref-stats.json");

type PhotoEntry = {
  thumbUrl: string;
  headshotUrl?: string;
  source?: string;
};

const PREFERRED_TITLES: Record<string, string> = {
  "Jesús Gil Manzano": "Jesús Gil Manzano",
  "Ricardo de Burgos Bengoetxea": "Ricardo de Burgos Bengoetxea",
  "José María Sánchez Martínez": "José María Sánchez Martínez",
  "Guillermo Cuadra Fernández": "Guillermo Cuadra Fernández",
  "Alejandro José Hernández Hernández": "Alejandro Hernández Hernández",
  "Juan Martínez Munuera": "Juan Martínez Munuera",
  "César Soto Grado": "César Soto Grado",
  "Antonio Miguel Mateu Lahoz": "Mateu Lahoz",
  "Carlos Del Cerro Grande": "Carlos del Cerro Grande",
  "José Luis Munuera Montero": "José Luis Munuera",
  "Pablo González Fuertes": "Pablo González Fuertes",
  "Mario Melero López": "Mario Melero López",
  "Javier Alberola Rojas": "Javier Alberola Rojas",
  "Isidro Díaz De Mera Escuderos": "Isidro Díaz de Mera",
  "Miguel Ángel Ortiz Arias": "Miguel Ángel Ortiz Arias",
  "Alejandro Muñiz Ruiz": "Alejandro Muñiz Ruiz",
  "Santiago Jaime Latre": "Santiago Jaime Latre",
};

async function resolveWikiTitle(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<{ title: string; lang: "en" | "es" } | null> {
  const resolved = resolveOfficialDisplayName(name, "laliga");

  const indexed = lookupCategoryTitle(resolved, categoryIndex, "laliga");
  if (indexed) return { title: indexed, lang: "en" };

  const aliasIndexed = lookupCategoryTitle(name, categoryIndex, "laliga");
  if (aliasIndexed) return { title: aliasIndexed, lang: "en" };

  if (PREFERRED_TITLES[name]) return { title: PREFERRED_TITLES[name], lang: "en" };
  if (PREFERRED_TITLES[resolved]) return { title: PREFERRED_TITLES[resolved], lang: "en" };

  for (const lang of ["en", "es"] as const) {
    for (const query of [
      `${resolved} (árbitro)`,
      `${resolved} (referee)`,
      `${resolved} árbitro`,
      `${resolved} football referee`,
      `${resolved} Spanish referee`,
      resolved,
      name,
    ]) {
      const hits = await wikiSearchTitles(query, lang);
      for (const title of hits) {
        if (!titleMatchesSportOfficial(resolved, title, "laliga")) continue;
        if (lang === "en" && (await isSportOfficialPage(title, "laliga"))) {
          return { title, lang };
        }
        if (title.toLowerCase().startsWith(`${resolved.toLowerCase()} (`)) {
          return { title, lang };
        }
        if (title.toLowerCase() === resolved.toLowerCase()) return { title, lang };
      }
      await sleep(80);
    }
  }
  return null;
}

async function fetchPhotoForOfficial(
  name: string,
  categoryIndex: Map<string, string>,
): Promise<PhotoEntry | null> {
  const resolved = resolveOfficialDisplayName(name, "laliga");
  const hit = await resolveWikiTitle(name, categoryIndex);
  if (hit) {
    const images =
      hit.lang === "es"
        ? await wikiPageImagesForLang(hit.title, "es")
        : await wikiPageImages(hit.title);
    if (images) {
      return {
        ...images,
        source: `wikipedia:${hit.lang}:${hit.title}`,
      };
    }
  }

  for (const searchName of [resolved, name]) {
    const commons = await commonsPhotoForLaLigaOfficial(searchName);
    if (commons) return commons;
  }

  return null;
}

async function main(): Promise<void> {
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const existing = fs.existsSync(OUT_PATH)
    ? (JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as { photos?: Record<string, PhotoEntry> })
    : { photos: {} };

  console.log("Loading Spanish football referee categories…");
  const spanish = await loadCategoryTitleIndex("Category:Spanish football referees");
  const fifa = await loadCategoryTitleIndex("Category:FIFA World Cup referees");
  const categoryIndex = new Map([...spanish, ...fifa]);
  console.log(`  ${categoryIndex.size} Wikipedia pages indexed`);

  const photos: Record<string, PhotoEntry> = { ...(existing.photos ?? {}) };
  let found = Object.keys(photos).length;
  let missed = 0;
  let newlyFound = 0;

  for (const ref of stats.refs) {
    if (photos[ref.slug]) continue;
    try {
      const entry = await fetchPhotoForOfficial(ref.name, categoryIndex);
      if (entry) {
        photos[ref.slug] = entry;
        found++;
        newlyFound++;
        console.log(`  ✓ ${ref.name} (${entry.source ?? "unknown"})`);
      } else {
        missed++;
        console.log(`  – ${ref.name}`);
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
          source: "wikipedia + commons",
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
  console.log(`Wrote ${found} La Liga ref photos (${newlyFound} new, ${missed} missed) → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
