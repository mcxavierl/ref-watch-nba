import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { SlateIngestionLogRecord } from "@/lib/cron/slate-poller-types";

type SlateIngestionDatabase = {
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

export type SlateIngestionLogStore = {
  append(record: SlateIngestionLogRecord): Promise<SlateIngestionLogRecord>;
};

const SCHEMA_PATH = path.join(process.cwd(), "src/lib/services/slate-ingestion-schema.sql");
const SQLITE_DB_PATH = path.join(process.cwd(), "data/api-keys.db");
const JSON_STORE_PATH = path.join(process.cwd(), "data/slate-ingestion-logs.json");

let storePromise: Promise<SlateIngestionLogStore> | null = null;

function createSqliteDatabase(): SlateIngestionDatabase | null {
  try {
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (filename: string) => SlateIngestionDatabase;
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

function readJsonStore(): SlateIngestionLogRecord[] {
  if (!fs.existsSync(JSON_STORE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(JSON_STORE_PATH, "utf8")) as SlateIngestionLogRecord[];
  } catch {
    return [];
  }
}

function writeJsonStore(records: SlateIngestionLogRecord[]): void {
  fs.mkdirSync(path.dirname(JSON_STORE_PATH), { recursive: true });
  fs.writeFileSync(JSON_STORE_PATH, `${JSON.stringify(records, null, 2)}\n`);
}

function createSqliteStore(db: SlateIngestionDatabase): SlateIngestionLogStore {
  return {
    async append(record) {
      db.prepare(
        `INSERT INTO slate_ingestion_logs
          (id, timestamp, games_updated, crews_assigned_count, latency_ms, status, projections_written, steps_completed, steps_failed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        record.id,
        record.timestamp,
        record.gamesUpdated,
        record.crewsAssignedCount,
        record.latencyMs,
        record.status,
        record.projectionsWritten,
        JSON.stringify(record.stepsCompleted),
        JSON.stringify(record.stepsFailed),
      );
      return record;
    },
  };
}

function createJsonStore(): SlateIngestionLogStore {
  return {
    async append(record) {
      const records = readJsonStore();
      records.unshift(record);
      writeJsonStore(records.slice(0, 200));
      return record;
    },
  };
}

function createD1Store(db: D1Database): SlateIngestionLogStore {
  let schemaReady: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    if (!schemaReady) {
      schemaReady = db.exec(fs.readFileSync(SCHEMA_PATH, "utf8")).then(() => undefined);
    }
    await schemaReady;
  }

  return {
    async append(record) {
      await ensureSchema();
      await db
        .prepare(
          `INSERT INTO slate_ingestion_logs
            (id, timestamp, games_updated, crews_assigned_count, latency_ms, status, projections_written, steps_completed, steps_failed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.timestamp,
          record.gamesUpdated,
          record.crewsAssignedCount,
          record.latencyMs,
          record.status,
          record.projectionsWritten,
          JSON.stringify(record.stepsCompleted),
          JSON.stringify(record.stepsFailed),
        )
        .run();
      return record;
    },
  };
}

export async function getSlateIngestionLogStore(): Promise<SlateIngestionLogStore> {
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

export function createSlateIngestionLogRecord(
  input: Omit<SlateIngestionLogRecord, "id" | "timestamp"> & {
    id?: string;
    timestamp?: string;
  },
): SlateIngestionLogRecord {
  return {
    id: input.id ?? randomUUID(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    gamesUpdated: input.gamesUpdated,
    crewsAssignedCount: input.crewsAssignedCount,
    latencyMs: input.latencyMs,
    status: input.status,
    projectionsWritten: input.projectionsWritten,
    stepsCompleted: input.stepsCompleted,
    stepsFailed: input.stepsFailed,
  };
}
