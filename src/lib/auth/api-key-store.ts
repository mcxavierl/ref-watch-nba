import * as fs from "node:fs";
import * as path from "node:path";
import {
  hashApiKey,
  verifyApiKey,
  type ApiKeyRecord,
  type ApiKeyTier,
  type ValidatedApiKey,
} from "@/lib/auth/apikey";

export type ApiUsageRecord = {
  apiKeyId: string;
  clientId: string;
  endpoint: string;
  method: string;
  latencyMs: number;
  statusCode: number;
};

type ApiKeyDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number };
  };
};

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<{ success: boolean }>;
};

type ApiKeyStore = {
  validateKey(plaintext: string): Promise<ValidatedApiKey | null>;
  recordUsage(record: ApiUsageRecord): Promise<void>;
  upsertKey(input: {
    id: string;
    clientId: string;
    label: string;
    tier: ApiKeyTier;
    plaintextKey: string;
  }): Promise<ApiKeyRecord>;
};

const SCHEMA_PATH = path.join(process.cwd(), "src/lib/auth/api-key-schema.sql");
const SQLITE_DB_PATH = path.join(process.cwd(), "data/api-keys.db");
const JSON_STORE_PATH = path.join(process.cwd(), "data/api-keys.json");

let storePromise: Promise<ApiKeyStore> | null = null;

function mapRow(row: Record<string, unknown>): ApiKeyRecord {
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? row.clientId),
    label: String(row.label),
    tier: String(row.tier) as ApiKeyTier,
    keyHash: String(row.key_hash ?? row.keyHash),
    requestCount: Number(row.request_count ?? row.requestCount ?? 0),
    active: row.active === 0 || row.active === false ? false : Boolean(row.active ?? true),
    createdAt: String(row.created_at ?? row.createdAt),
    lastUsedAt:
      row.last_used_at === null || row.last_used_at === undefined
        ? null
        : String(row.last_used_at ?? row.lastUsedAt),
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

function createSqliteDatabase(): ApiKeyDatabase | null {
  try {
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (filename: string) => ApiKeyDatabase;
    };
    fs.mkdirSync(path.dirname(SQLITE_DB_PATH), { recursive: true });
    const db = new DatabaseSync(SQLITE_DB_PATH);
    db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
    return db;
  } catch {
    return null;
  }
}

type JsonStoreFile = {
  keys: ApiKeyRecord[];
  usage: ApiUsageRecord[];
};

function readJsonStore(): JsonStoreFile {
  if (!fs.existsSync(JSON_STORE_PATH)) {
    return { keys: [], usage: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(JSON_STORE_PATH, "utf8")) as JsonStoreFile;
  } catch {
    return { keys: [], usage: [] };
  }
}

function writeJsonStore(store: JsonStoreFile): void {
  fs.mkdirSync(path.dirname(JSON_STORE_PATH), { recursive: true });
  fs.writeFileSync(JSON_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
}

function createD1Store(db: D1Database): ApiKeyStore {
  let schemaReady: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    if (!schemaReady) {
      schemaReady = db.exec(fs.readFileSync(SCHEMA_PATH, "utf8")).then(() => undefined);
    }
    await schemaReady;
  }

  return {
    async validateKey(plaintext) {
      await ensureSchema();
      const rows = await db
        .prepare(
          `SELECT id, client_id, label, tier, key_hash, request_count, active, created_at, last_used_at
           FROM api_keys
           WHERE active = 1`,
        )
        .all<Record<string, unknown>>();
      for (const row of rows.results) {
        const record = mapRow(row);
        if (!verifyApiKey(plaintext, record.keyHash)) continue;
        return {
          id: record.id,
          clientId: record.clientId,
          label: record.label,
          tier: record.tier,
        };
      }
      return null;
    },
    async recordUsage(record) {
      await ensureSchema();
      const now = new Date().toISOString();
      await db
        .prepare(
          `INSERT INTO api_usage_logs
            (api_key_id, client_id, endpoint, method, latency_ms, status_code, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.apiKeyId,
          record.clientId,
          record.endpoint,
          record.method,
          record.latencyMs,
          record.statusCode,
          now,
        )
        .run();
      await db
        .prepare(
          `UPDATE api_keys
           SET request_count = request_count + 1, last_used_at = ?
           WHERE id = ?`,
        )
        .bind(now, record.apiKeyId)
        .run();
    },
    async upsertKey(input) {
      await ensureSchema();
      const now = new Date().toISOString();
      const keyHash = hashApiKey(input.plaintextKey);
      await db
        .prepare(
          `INSERT INTO api_keys
            (id, client_id, label, tier, key_hash, request_count, active, created_at, last_used_at)
           VALUES (?, ?, ?, ?, ?, 0, 1, ?, NULL)
           ON CONFLICT(id) DO UPDATE SET
             client_id = excluded.client_id,
             label = excluded.label,
             tier = excluded.tier,
             key_hash = excluded.key_hash,
             active = 1`,
        )
        .bind(input.id, input.clientId, input.label, input.tier, keyHash, now)
        .run();
      return {
        id: input.id,
        clientId: input.clientId,
        label: input.label,
        tier: input.tier,
        keyHash,
        requestCount: 0,
        active: true,
        createdAt: now,
        lastUsedAt: null,
      };
    },
  };
}

function createSqliteStore(db: ApiKeyDatabase): ApiKeyStore {
  return {
    async validateKey(plaintext) {
      const rows = db
        .prepare(
          `SELECT id, client_id, label, tier, key_hash, request_count, active, created_at, last_used_at
           FROM api_keys
           WHERE active = 1`,
        )
        .all() as Record<string, unknown>[];
      for (const row of rows) {
        const record = mapRow(row);
        if (!verifyApiKey(plaintext, record.keyHash)) continue;
        return {
          id: record.id,
          clientId: record.clientId,
          label: record.label,
          tier: record.tier,
        };
      }
      return null;
    },
    async recordUsage(record) {
      const now = new Date().toISOString();
      db
        .prepare(
          `INSERT INTO api_usage_logs
            (api_key_id, client_id, endpoint, method, latency_ms, status_code, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          record.apiKeyId,
          record.clientId,
          record.endpoint,
          record.method,
          record.latencyMs,
          record.statusCode,
          now,
        );
      db
        .prepare(
          `UPDATE api_keys
           SET request_count = request_count + 1, last_used_at = ?
           WHERE id = ?`,
        )
        .run(now, record.apiKeyId);
    },
    async upsertKey(input) {
      const now = new Date().toISOString();
      const keyHash = hashApiKey(input.plaintextKey);
      db
        .prepare(
          `INSERT INTO api_keys
            (id, client_id, label, tier, key_hash, request_count, active, created_at, last_used_at)
           VALUES (?, ?, ?, ?, ?, 0, 1, ?, NULL)
           ON CONFLICT(id) DO UPDATE SET
             client_id = excluded.client_id,
             label = excluded.label,
             tier = excluded.tier,
             key_hash = excluded.key_hash,
             active = 1`,
        )
        .run(input.id, input.clientId, input.label, input.tier, keyHash, now);
      return {
        id: input.id,
        clientId: input.clientId,
        label: input.label,
        tier: input.tier,
        keyHash,
        requestCount: 0,
        active: true,
        createdAt: now,
        lastUsedAt: null,
      };
    },
  };
}

function createJsonStore(): ApiKeyStore {
  return {
    async validateKey(plaintext) {
      const store = readJsonStore();
      for (const record of store.keys) {
        if (!record.active) continue;
        if (!verifyApiKey(plaintext, record.keyHash)) continue;
        return {
          id: record.id,
          clientId: record.clientId,
          label: record.label,
          tier: record.tier,
        };
      }
      return null;
    },
    async recordUsage(record) {
      const store = readJsonStore();
      const key = store.keys.find((row) => row.id === record.apiKeyId);
      if (key) {
        key.requestCount += 1;
        key.lastUsedAt = new Date().toISOString();
      }
      store.usage.push(record);
      if (store.usage.length > 5000) {
        store.usage = store.usage.slice(-5000);
      }
      writeJsonStore(store);
    },
    async upsertKey(input) {
      const store = readJsonStore();
      const now = new Date().toISOString();
      const keyHash = hashApiKey(input.plaintextKey);
      const next: ApiKeyRecord = {
        id: input.id,
        clientId: input.clientId,
        label: input.label,
        tier: input.tier,
        keyHash,
        requestCount: 0,
        active: true,
        createdAt: now,
        lastUsedAt: null,
      };
      const index = store.keys.findIndex((row) => row.id === input.id);
      if (index >= 0) {
        store.keys[index] = { ...store.keys[index], ...next };
      } else {
        store.keys.push(next);
      }
      writeJsonStore(store);
      return next;
    },
  };
}

export async function getApiKeyStore(): Promise<ApiKeyStore> {
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

export async function validateStoredApiKey(
  plaintext: string,
): Promise<ValidatedApiKey | null> {
  const store = await getApiKeyStore();
  return store.validateKey(plaintext);
}

export async function recordApiUsage(record: ApiUsageRecord): Promise<void> {
  const store = await getApiKeyStore();
  await store.recordUsage(record);
}

export async function upsertApiKey(input: {
  id: string;
  clientId: string;
  label: string;
  tier: ApiKeyTier;
  plaintextKey: string;
}): Promise<ApiKeyRecord> {
  const store = await getApiKeyStore();
  return store.upsertKey(input);
}
