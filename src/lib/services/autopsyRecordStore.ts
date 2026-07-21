import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AutopsyRecord } from "@/lib/cron/recalibrate-profiles-types";

type AutopsyDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number };
  };
};

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<{ success: boolean }>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<{ success: boolean }>;
};

export type AutopsyInsertSubscriber = (record: AutopsyRecord) => Promise<void>;

export type AutopsyRecordStore = {
  append(record: AutopsyRecord): Promise<AutopsyRecord>;
  subscribe(listener: AutopsyInsertSubscriber): () => void;
};

const SCHEMA_PATH = path.join(process.cwd(), "src/lib/services/autopsy-schema.sql");
const SQLITE_DB_PATH = path.join(process.cwd(), "data/api-keys.db");
const JSON_STORE_PATH = path.join(process.cwd(), "data/autopsy-records.json");

let subscriberBootstrapped = false;

async function ensureRecalibrationSubscriber(): Promise<void> {
  if (subscriberBootstrapped) return;
  const { registerAutopsyRecalibrationSubscriber } = await import(
    "@/lib/cron/autopsy-recalibrate-subscriber"
  );
  await registerAutopsyRecalibrationSubscriber();
  subscriberBootstrapped = true;
}

const subscribers = new Set<AutopsyInsertSubscriber>();
let storePromise: Promise<AutopsyRecordStore> | null = null;

function createSqliteDatabase(): AutopsyDatabase | null {
  try {
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (filename: string) => AutopsyDatabase;
    };
    fs.mkdirSync(path.dirname(SQLITE_DB_PATH), { recursive: true });
    const db = new DatabaseSync(SQLITE_DB_PATH);
    db.exec(fs.readFileSync(path.join(process.cwd(), "src/lib/auth/api-key-schema.sql"), "utf8"));
    db.exec(fs.readFileSync(path.join(process.cwd(), "src/lib/services/anomaly-schema.sql"), "utf8"));
    db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
    return db;
  } catch {
    return null;
  }
}

async function getD1Database(): Promise<D1Database | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as { API_KEYS_DB?: D1Database }).API_KEYS_DB;
    return db ?? null;
  } catch {
    return null;
  }
}

function readJsonStore(): AutopsyRecord[] {
  if (!fs.existsSync(JSON_STORE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(JSON_STORE_PATH, "utf8")) as AutopsyRecord[];
  } catch {
    return [];
  }
}

function writeJsonStore(records: AutopsyRecord[]): void {
  fs.mkdirSync(path.dirname(JSON_STORE_PATH), { recursive: true });
  fs.writeFileSync(JSON_STORE_PATH, `${JSON.stringify(records, null, 2)}\n`);
}

async function notifySubscribers(record: AutopsyRecord): Promise<void> {
  for (const listener of subscribers) {
    await listener(record);
  }
}

function createSqliteStore(db: AutopsyDatabase): AutopsyRecordStore {
  return {
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    async append(record) {
      db.prepare(
        `INSERT INTO autopsy_records
          (id, game_id, league_id, official_slugs, home_team, away_team, season,
           actual_fouls, expected_fouls, delta, rarity_percentile,
           attribution_crew_pct, attribution_style_pct, attribution_gamestate_pct,
           summary_text, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        record.id,
        record.gameId,
        record.leagueId,
        JSON.stringify(record.officialSlugs),
        record.homeTeam,
        record.awayTeam,
        record.season,
        record.actualFouls,
        record.expectedFouls,
        record.delta,
        record.rarityPercentile,
        record.attributionCrewPct,
        record.attributionStylePct,
        record.attributionGamestatePct,
        record.summaryText,
        record.status,
        record.createdAt,
      );
      await notifySubscribers(record);
      return record;
    },
  };
}

function createJsonStore(): AutopsyRecordStore {
  return {
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    async append(record) {
      const records = readJsonStore();
      records.unshift(record);
      writeJsonStore(records.slice(0, 500));
      await notifySubscribers(record);
      return record;
    },
  };
}

function createD1Store(db: D1Database): AutopsyRecordStore {
  let schemaReady: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    if (!schemaReady) {
      schemaReady = db.exec(fs.readFileSync(SCHEMA_PATH, "utf8")).then(() => undefined);
    }
    await schemaReady;
  }

  return {
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    async append(record) {
      await ensureSchema();
      await db
        .prepare(
          `INSERT INTO autopsy_records
            (id, game_id, league_id, official_slugs, home_team, away_team, season,
             actual_fouls, expected_fouls, delta, rarity_percentile,
             attribution_crew_pct, attribution_style_pct, attribution_gamestate_pct,
             summary_text, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.gameId,
          record.leagueId,
          JSON.stringify(record.officialSlugs),
          record.homeTeam,
          record.awayTeam,
          record.season,
          record.actualFouls,
          record.expectedFouls,
          record.delta,
          record.rarityPercentile,
          record.attributionCrewPct,
          record.attributionStylePct,
          record.attributionGamestatePct,
          record.summaryText,
          record.status,
          record.createdAt,
        )
        .run();
      await notifySubscribers(record);
      return record;
    },
  };
}

export async function getAutopsyRecordStore(): Promise<AutopsyRecordStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const d1 = await getD1Database();
      if (d1) return createD1Store(d1);
      const sqlite = createSqliteDatabase();
      if (sqlite) return createSqliteStore(sqlite);
      return createJsonStore();
    })();
  }
  return storePromise;
}

export function createAutopsyRecord(
  input: Omit<AutopsyRecord, "id" | "createdAt" | "status"> & {
    id?: string;
    createdAt?: string;
    status?: AutopsyRecord["status"];
  },
): AutopsyRecord {
  return {
    id: input.id ?? randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    status: input.status ?? "COMPLETED",
    gameId: input.gameId,
    leagueId: input.leagueId,
    officialSlugs: input.officialSlugs,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    season: input.season,
    actualFouls: input.actualFouls,
    expectedFouls: input.expectedFouls,
    delta: input.delta,
    rarityPercentile: input.rarityPercentile,
    attributionCrewPct: input.attributionCrewPct,
    attributionStylePct: input.attributionStylePct,
    attributionGamestatePct: input.attributionGamestatePct,
    summaryText: input.summaryText,
  };
}

export async function appendAutopsyRecord(record: AutopsyRecord): Promise<AutopsyRecord> {
  await ensureRecalibrationSubscriber();
  return (await getAutopsyRecordStore()).append(record);
}

export function subscribeToAutopsyInserts(listener: AutopsyInsertSubscriber): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
