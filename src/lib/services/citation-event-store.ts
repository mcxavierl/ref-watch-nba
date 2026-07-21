import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { CitationEventPayload } from "@/lib/intelligence/intelligence-card-types";

export type CitationEventRecord = CitationEventPayload & {
  id: string;
  createdAt: string;
};

type CitationDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number };
  };
};

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<{ success: boolean }>;
};

type CitationStore = {
  persist(payload: CitationEventPayload): Promise<CitationEventRecord>;
};

const SCHEMA_PATH = path.join(process.cwd(), "src/lib/services/citation-schema.sql");
const API_SCHEMA_PATH = path.join(process.cwd(), "src/lib/auth/api-key-schema.sql");
const SQLITE_DB_PATH = path.join(process.cwd(), "data/api-keys.db");
const JSON_STORE_PATH = path.join(process.cwd(), "data/citation-events.json");
const MAX_EVENTS = 10_000;

let storePromise: Promise<CitationStore> | null = null;

function mapRecord(row: Record<string, unknown>): CitationEventRecord {
  return {
    id: String(row.id),
    gameId: String(row.game_id ?? row.gameId),
    refCrew: String(row.ref_crew ?? row.refCrew),
    metricType: String(row.metric_type ?? row.metricType),
    action: String(row.action),
    createdAt: String(row.created_at ?? row.createdAt),
  };
}

function buildRecord(payload: CitationEventPayload): CitationEventRecord {
  return {
    ...payload,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
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

function createSqliteDatabase(): CitationDatabase | null {
  try {
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (filename: string) => CitationDatabase;
    };
    fs.mkdirSync(path.dirname(SQLITE_DB_PATH), { recursive: true });
    const db = new DatabaseSync(SQLITE_DB_PATH);
    db.exec(fs.readFileSync(API_SCHEMA_PATH, "utf8"));
    db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
    return db;
  } catch {
    return null;
  }
}

type JsonCitationStore = {
  events: CitationEventRecord[];
};

function readJsonStore(): JsonCitationStore {
  if (!fs.existsSync(JSON_STORE_PATH)) {
    return { events: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(JSON_STORE_PATH, "utf8")) as JsonCitationStore;
    return { events: parsed.events ?? [] };
  } catch {
    return { events: [] };
  }
}

function writeJsonStore(store: JsonCitationStore): void {
  fs.mkdirSync(path.dirname(JSON_STORE_PATH), { recursive: true });
  fs.writeFileSync(JSON_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
}

function migrateJsonEventsToSqlite(db: CitationDatabase): void {
  const countRow = db
    .prepare("SELECT COUNT(*) AS count FROM citation_events")
    .get() as Record<string, unknown> | undefined;
  const existing = Number(countRow?.count ?? 0);
  if (existing > 0) return;

  const legacy = readJsonStore();
  if (legacy.events.length === 0) return;

  const insert = db.prepare(
    `INSERT INTO citation_events (id, game_id, ref_crew, metric_type, action, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const event of legacy.events.slice(-MAX_EVENTS)) {
    insert.run(
      event.id,
      event.gameId,
      event.refCrew,
      event.metricType,
      event.action,
      event.createdAt,
    );
  }
}

function createSqliteStore(db: CitationDatabase): CitationStore {
  migrateJsonEventsToSqlite(db);
  return {
    async persist(payload) {
      const record = buildRecord(payload);
      db.prepare(
        `INSERT INTO citation_events (id, game_id, ref_crew, metric_type, action, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        record.id,
        record.gameId,
        record.refCrew,
        record.metricType,
        record.action,
        record.createdAt,
      );
      return record;
    },
  };
}

function createD1Store(db: D1Database): CitationStore {
  let schemaReady: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    if (!schemaReady) {
      schemaReady = db
        .exec(`${fs.readFileSync(API_SCHEMA_PATH, "utf8")}\n${fs.readFileSync(SCHEMA_PATH, "utf8")}`)
        .then(() => undefined);
    }
    await schemaReady;
  }

  return {
    async persist(payload) {
      await ensureSchema();
      const record = buildRecord(payload);
      await db
        .prepare(
          `INSERT INTO citation_events (id, game_id, ref_crew, metric_type, action, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.gameId,
          record.refCrew,
          record.metricType,
          record.action,
          record.createdAt,
        )
        .run();
      return record;
    },
  };
}

function createJsonStore(): CitationStore {
  return {
    async persist(payload) {
      const store = readJsonStore();
      const record = buildRecord(payload);
      store.events.push(record);
      if (store.events.length > MAX_EVENTS) {
        store.events = store.events.slice(-MAX_EVENTS);
      }
      writeJsonStore(store);
      return record;
    },
  };
}

async function getCitationStore(): Promise<CitationStore> {
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

export async function persistCitationEvent(
  payload: CitationEventPayload,
): Promise<CitationEventRecord> {
  const store = await getCitationStore();
  return store.persist(payload);
}

export function isCitationEventPayload(value: unknown): value is CitationEventPayload {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.gameId === "string" &&
    row.gameId.trim().length > 0 &&
    typeof row.refCrew === "string" &&
    row.refCrew.trim().length > 0 &&
    typeof row.metricType === "string" &&
    typeof row.action === "string" &&
    row.action === "COPY_CITATION"
  );
}
