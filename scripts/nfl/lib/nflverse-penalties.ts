import * as fs from "node:fs";
import * as path from "node:path";
import { normalizeNflverseTeam } from "./nflverse-lines";

export type NflPenaltyGameIndex = Record<
  string,
  {
    homeTeam: string;
    awayTeam: string;
    homeFlags: number;
    awayFlags: number;
    homePenaltyYards: number;
    awayPenaltyYards: number;
  }
>;

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

function parsePenaltyCsv(csv: string): NflPenaltyGameIndex {
  const rows = csv.trim().split("\n");
  const header = parseCsvRow(rows[0] ?? "");
  const idx = (name: string) => header.indexOf(name);

  const gameIdI = idx("game_id");
  const homeI = idx("home_team");
  const awayI = idx("away_team");
  const penaltyI = idx("penalty");
  const penaltyTeamI = idx("penalty_team");
  const penaltyYardsI = idx("penalty_yards");

  const index: NflPenaltyGameIndex = {};

  for (let r = 1; r < rows.length; r++) {
    const fields = parseCsvRow(rows[r] ?? "");
    if (fields[penaltyI] !== "1") continue;

    const gameId = fields[gameIdI]?.trim();
    const penaltyTeam = normalizeNflverseTeam(fields[penaltyTeamI] ?? "");
    if (!gameId || !penaltyTeam) continue;

    const homeTeam = normalizeNflverseTeam(fields[homeI] ?? "");
    const awayTeam = normalizeNflverseTeam(fields[awayI] ?? "");
    const yardsRaw = Number(fields[penaltyYardsI]);
    const yards = Number.isFinite(yardsRaw) ? Math.abs(yardsRaw) : 0;

    const entry =
      index[gameId] ??
      (index[gameId] = {
        homeTeam,
        awayTeam,
        homeFlags: 0,
        awayFlags: 0,
        homePenaltyYards: 0,
        awayPenaltyYards: 0,
      });

    if (penaltyTeam === homeTeam) {
      entry.homeFlags += 1;
      entry.homePenaltyYards += yards;
    } else if (penaltyTeam === awayTeam) {
      entry.awayFlags += 1;
      entry.awayPenaltyYards += yards;
    }
  }

  return index;
}

async function fetchPbpYear(year: number, cacheDir: string): Promise<string> {
  const cachePath = path.join(cacheDir, `play_by_play_${year}.csv`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf8");
  }

  console.log(`  Downloading nflverse PBP ${year}…`);
  const res = await fetch(PBP_URL(year));
  if (!res.ok) {
    throw new Error(`PBP ${year} fetch failed: ${res.status}`);
  }
  const csv = await res.text();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, csv);
  return csv;
}

/** Build or load cached penalty counts per nflverse game_id (2000–2015). */
export async function loadNflversePenaltyIndex(
  dataDir: string,
  options: { minYear?: number; maxYear?: number; force?: boolean } = {},
): Promise<NflPenaltyGameIndex> {
  const minYear = options.minYear ?? 2000;
  const maxYear = options.maxYear ?? 2015;
  const cachePath = path.join(dataDir, "nflverse-penalties-by-game.json");
  const pbpCacheDir = path.join(dataDir, "pbp-cache");

  if (!options.force && fs.existsSync(cachePath)) {
    const cached = JSON.parse(
      fs.readFileSync(cachePath, "utf8"),
    ) as NflPenaltyGameIndex;
    if (Object.keys(cached).length > 3000) {
      console.log(
        `Using cached nflverse penalties (${Object.keys(cached).length} games)`,
      );
      return cached;
    }
  }

  console.log(`Building nflverse penalty index (${minYear}–${maxYear})…`);
  const merged: NflPenaltyGameIndex = {};

  for (let year = minYear; year <= maxYear; year++) {
    const csv = await fetchPbpYear(year, pbpCacheDir);
    const yearIndex = parsePenaltyCsv(csv);
    Object.assign(merged, yearIndex);
    console.log(`  ${year}: ${Object.keys(yearIndex).length} penalized games`);
  }

  fs.writeFileSync(cachePath, `${JSON.stringify(merged)}\n`);
  console.log(`Wrote ${cachePath} (${Object.keys(merged).length} games)`);
  return merged;
}
