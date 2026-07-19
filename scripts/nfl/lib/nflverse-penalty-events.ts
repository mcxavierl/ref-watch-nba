import * as fs from "node:fs";
import * as path from "node:path";
import {
  aggregateGameLeverageImpact,
  buildPenaltyEvent,
} from "../../../src/lib/impact-calculator";
import type { NflPenaltyEvent } from "../../../src/lib/types";
import { normalizeNflverseTeam } from "./nflverse-lines";
import { tagNflPenaltyEvent } from "./ingest-utils";

export type NflPenaltyEventIndex = Record<string, NflPenaltyEvent[]>;

const PBP_URL = (year: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${year}.csv`;

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields;
}

function parseNum(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parsePenaltyEventsCsv(csv: string): NflPenaltyEventIndex {
  const rows = csv.trim().split("\n");
  const header = parseCsvRow(rows[0] ?? "");
  const idx = (name: string) => header.indexOf(name);

  const gameIdI = idx("game_id");
  const penaltyI = idx("penalty");
  const penaltyTeamI = idx("penalty_team");
  const penaltyYardsI = idx("penalty_yards");
  const penaltyTypeI = idx("penalty_type");
  const downI = idx("down");
  const distanceI = idx("ydstogo");
  const yardLineI = idx("yardline_100");
  const quarterI = idx("qtr");
  const secondsI = idx("game_seconds_remaining");
  const scoreDiffI = idx("score_differential");
  const wpI = idx("wp");
  const wpaI = idx("wpa");

  const index: NflPenaltyEventIndex = {};

  for (let r = 1; r < rows.length; r++) {
    const fields = parseCsvRow(rows[r] ?? "");
    if (fields[penaltyI] !== "1") continue;

    const gameId = fields[gameIdI]?.trim();
    const penaltyTeam = normalizeNflverseTeam(fields[penaltyTeamI] ?? "");
    const rawType = fields[penaltyTypeI]?.trim() ?? "unknown";
    if (!gameId || !penaltyTeam) continue;

    const yardsRaw = Number(fields[penaltyYardsI]);
    const yards = Number.isFinite(yardsRaw) ? Math.abs(yardsRaw) : 0;

    const event = tagNflPenaltyEvent(
      buildPenaltyEvent(
        rawType,
        penaltyTeam,
        yards,
        {
          down: parseNum(fields[downI]),
          distance: parseNum(fields[distanceI]),
          yardLine: parseNum(fields[yardLineI]),
          quarter: parseNum(fields[quarterI]),
          gameSecondsRemaining: parseNum(fields[secondsI]),
          scoreDifferential: parseNum(fields[scoreDiffI]),
          wpBefore: parseNum(fields[wpI]),
          wpaDelta: parseNum(fields[wpaI]),
        },
        true,
      ),
    );

    const bucket = index[gameId] ?? [];
    bucket.push(event);
    index[gameId] = bucket;
  }

  return index;
}

async function fetchPbpYear(year: number, cacheDir: string): Promise<string> {
  const cachePath = path.join(cacheDir, `play_by_play_${year}.csv`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf8");
  }

  console.log(`  Downloading nflverse PBP ${year} for penalty events…`);
  const res = await fetch(PBP_URL(year));
  if (!res.ok) {
    throw new Error(`PBP ${year} fetch failed: ${res.status}`);
  }
  const csv = await res.text();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, csv);
  return csv;
}

export function summarizePenaltyEvents(events: NflPenaltyEvent[]): {
  highLeverageImpact: number;
  highLeverageFlagRate: number;
} {
  const summary = aggregateGameLeverageImpact(events);
  const rate =
    summary.flagCount > 0
      ? summary.highLeverageFlagCount / summary.flagCount
      : 0;
  return {
    highLeverageImpact: summary.highLeverageScore,
    highLeverageFlagRate: Math.round(rate * 1000) / 1000,
  };
}

/** Build or load cached play-level penalty events keyed by nflverse game_id. */
export async function loadNflversePenaltyEventIndex(
  dataDir: string,
  options: { minYear?: number; maxYear?: number; force?: boolean } = {},
): Promise<NflPenaltyEventIndex> {
  const minYear = options.minYear ?? 2000;
  const maxYear = options.maxYear ?? 2024;
  const cachePath = path.join(dataDir, "penalty-events-by-game.json");
  const pbpCacheDir = path.join(dataDir, "pbp-cache");

  if (!options.force && fs.existsSync(cachePath)) {
    const cached = JSON.parse(
      fs.readFileSync(cachePath, "utf8"),
    ) as NflPenaltyEventIndex;
    if (Object.keys(cached).length > 3000) {
      console.log(
        `Using cached penalty events (${Object.keys(cached).length} games)`,
      );
      return cached;
    }
  }

  console.log(`Building nflverse penalty event index (${minYear}–${maxYear})…`);
  const merged: NflPenaltyEventIndex = {};

  for (let year = minYear; year <= maxYear; year++) {
    const csv = await fetchPbpYear(year, pbpCacheDir);
    const yearIndex = parsePenaltyEventsCsv(csv);
    Object.assign(merged, yearIndex);
    console.log(`  ${year}: ${Object.keys(yearIndex).length} games with events`);
  }

  fs.writeFileSync(cachePath, `${JSON.stringify(merged)}\n`);
  console.log(`Wrote ${cachePath} (${Object.keys(merged).length} games)`);
  return merged;
}

/** Build penalty event index from local pbp-cache CSVs (no network). */
export function buildPenaltyEventIndexFromPbpCache(
  dataDir: string,
): NflPenaltyEventIndex | null {
  const pbpCacheDir = path.join(dataDir, "pbp-cache");
  if (!fs.existsSync(pbpCacheDir)) return null;

  const merged: NflPenaltyEventIndex = {};
  for (const fileName of fs.readdirSync(pbpCacheDir)) {
    if (!fileName.startsWith("play_by_play_") || !fileName.endsWith(".csv")) {
      continue;
    }
    const csv = fs.readFileSync(path.join(pbpCacheDir, fileName), "utf8");
    Object.assign(merged, parsePenaltyEventsCsv(csv));
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

export function loadCachedPenaltyEventIndex(
  dataDir: string,
  options: { writeCache?: boolean } = {},
): NflPenaltyEventIndex | null {
  const cachePath = path.join(dataDir, "penalty-events-by-game.json");
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(
        fs.readFileSync(cachePath, "utf8"),
      ) as NflPenaltyEventIndex;
      if (Object.keys(cached).length > 0) return cached;
    } catch {
      // fall through to pbp-cache rebuild
    }
  }

  const fromPbp = buildPenaltyEventIndexFromPbpCache(dataDir);
  if (!fromPbp) return null;

  if (options.writeCache) {
    fs.writeFileSync(cachePath, `${JSON.stringify(fromPbp)}\n`);
    console.log(
      `Wrote ${cachePath} from pbp-cache (${Object.keys(fromPbp).length} games)`,
    );
  } else {
    console.log(
      `Using pbp-cache penalty events (${Object.keys(fromPbp).length} games, in-memory)`,
    );
  }

  return fromPbp;
}
