import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildRefTeamStat } from "../../../scripts/lib/ref-team-stats";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefTeamStat } from "@/lib/types";

export type RefTeamHistoryRow = {
  id: string;
  leagueId: LeagueId;
  officialSlug: string;
  teamAbbr: string;
  games: number;
  winRate: number;
  avgFoulDifferential: number;
  updatedAt: string;
};

type RefTeamHistoryDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number };
  };
};

const SCHEMA_PATH = path.join(process.cwd(), "src/lib/services/autopsy-schema.sql");
const SQLITE_DB_PATH = path.join(process.cwd(), "data/api-keys.db");
const JSON_STORE_PATH = path.join(process.cwd(), "data/ref-team-history.json");

function createSqliteDatabase(): RefTeamHistoryDatabase | null {
  try {
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (filename: string) => RefTeamHistoryDatabase;
    };
    fs.mkdirSync(path.dirname(SQLITE_DB_PATH), { recursive: true });
    const db = new DatabaseSync(SQLITE_DB_PATH);
    db.exec(fs.readFileSync(path.join(process.cwd(), "src/lib/auth/api-key-schema.sql"), "utf8"));
    db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
    return db;
  } catch {
    return null;
  }
}

function readJsonStore(): RefTeamHistoryRow[] {
  if (!fs.existsSync(JSON_STORE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(JSON_STORE_PATH, "utf8")) as RefTeamHistoryRow[];
  } catch {
    return [];
  }
}

function writeJsonStore(rows: RefTeamHistoryRow[]): void {
  fs.mkdirSync(path.dirname(JSON_STORE_PATH), { recursive: true });
  fs.writeFileSync(JSON_STORE_PATH, `${JSON.stringify(rows, null, 2)}\n`);
}

function gameRowsForTeam(profile: RefProfile, teamAbbr: string) {
  const stat = profile.teamStats?.[teamAbbr];
  if (!stat) return [];
  return Array.from({ length: stat.games }, (_, index) => ({
    gameId: `${profile.slug}:${teamAbbr}:${index}`,
    foulDifferential: stat.avgFoulDifferential,
    totalPoints: stat.avgTotalPoints,
    overHit: stat.overRate >= 0.5,
    teamWin: (stat.winRate ?? 0) >= 0.5,
  }));
}

export function rebuildRefTeamStatForTeam(
  profile: RefProfile,
  teamAbbr: string,
): RefTeamStat | null {
  const rows = gameRowsForTeam(profile, teamAbbr);
  if (rows.length === 0) return profile.teamStats?.[teamAbbr] ?? null;
  return buildRefTeamStat(rows);
}

export function updateProfileTeamHistory(
  profile: RefProfile,
  teamAbbrs: string[],
): { profile: RefProfile; rowsUpdated: number } {
  const teamStats = { ...(profile.teamStats ?? {}) };
  let rowsUpdated = 0;

  for (const teamAbbr of teamAbbrs) {
    const rebuilt = rebuildRefTeamStatForTeam(profile, teamAbbr);
    if (!rebuilt) continue;
    teamStats[teamAbbr] = rebuilt;
    rowsUpdated += 1;
  }

  return {
    profile: {
      ...profile,
      teamStats,
    },
    rowsUpdated,
  };
}

export async function persistRefTeamHistoryRows(
  rows: RefTeamHistoryRow[],
): Promise<void> {
  const db = createSqliteDatabase();
  if (db) {
    for (const row of rows) {
      db.prepare(
        `INSERT OR REPLACE INTO ref_team_history
          (id, league_id, official_slug, team_abbr, games, win_rate, avg_foul_differential, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        row.id,
        row.leagueId,
        row.officialSlug,
        row.teamAbbr,
        row.games,
        row.winRate,
        row.avgFoulDifferential,
        row.updatedAt,
      );
    }
    return;
  }

  const existing = readJsonStore().filter(
    (row) =>
      !rows.some(
        (next) =>
          next.leagueId === row.leagueId &&
          next.officialSlug === row.officialSlug &&
          next.teamAbbr === row.teamAbbr,
      ),
  );
  writeJsonStore([...rows, ...existing].slice(0, 5000));
}

export function refTeamHistoryRowsFromProfile(
  leagueId: LeagueId,
  profile: RefProfile,
  teamAbbrs: string[],
  updatedAt: string,
): RefTeamHistoryRow[] {
  const rows: RefTeamHistoryRow[] = [];
  for (const teamAbbr of teamAbbrs) {
    const stat = profile.teamStats?.[teamAbbr];
    if (!stat) continue;
    rows.push({
      id: randomUUID(),
      leagueId,
      officialSlug: profile.slug,
      teamAbbr,
      games: stat.games,
      winRate: stat.winRate,
      avgFoulDifferential: stat.avgFoulDifferential,
      updatedAt,
    });
  }
  return rows;
}
