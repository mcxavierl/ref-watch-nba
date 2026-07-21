import { createHmac, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AnomalyDetectedEvent } from "@/lib/services/anomalyMonitor";

export type WebhookSubscriber = {
  id: string;
  clientId: string;
  label: string;
  url: string;
  secret: string;
  active: boolean;
  eventKinds: string[];
  createdAt: string;
};

export type WebhookQueueJob = {
  id: string;
  subscriberId: string;
  clientId: string;
  payload: string;
  status: "pending" | "processing" | "delivered" | "failed" | "dead";
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

type WebhookDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number };
  };
};

const SQLITE_DB_PATH = path.join(process.cwd(), "data/api-keys.db");
const JSON_STORE_PATH = path.join(process.cwd(), "data/webhook-queue.json");

let storePromise: Promise<WebhookStore> | null = null;

type WebhookStore = {
  listActiveSubscribers(): Promise<WebhookSubscriber[]>;
  upsertSubscriber(input: Omit<WebhookSubscriber, "createdAt"> & { createdAt?: string }): Promise<WebhookSubscriber>;
  enqueueJob(input: {
    subscriberId: string;
    clientId: string;
    payload: string;
    maxAttempts?: number;
  }): Promise<WebhookQueueJob>;
  claimDueJobs(limit: number, nowIso: string): Promise<WebhookQueueJob[]>;
  markDelivered(jobId: string, deliveredAt: string): Promise<void>;
  markRetry(job: WebhookQueueJob, error: string, nextAttemptAt: string): Promise<void>;
  markDead(jobId: string, error: string): Promise<void>;
  logDelivery(input: {
    queueId: string;
    subscriberId: string;
    clientId: string;
    statusCode: number | null;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void>;
};

function mapSubscriber(row: Record<string, unknown>): WebhookSubscriber {
  const eventKindsRaw = row.event_kinds ?? row.eventKinds ?? '["ANOMALY_DETECTED"]';
  let eventKinds: string[] = ["ANOMALY_DETECTED"];
  try {
    eventKinds = JSON.parse(String(eventKindsRaw)) as string[];
  } catch {
    eventKinds = ["ANOMALY_DETECTED"];
  }
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? row.clientId),
    label: String(row.label),
    url: String(row.url),
    secret: String(row.secret),
    active: row.active === 0 || row.active === false ? false : Boolean(row.active ?? true),
    eventKinds,
    createdAt: String(row.created_at ?? row.createdAt),
  };
}

function mapJob(row: Record<string, unknown>): WebhookQueueJob {
  return {
    id: String(row.id),
    subscriberId: String(row.subscriber_id ?? row.subscriberId),
    clientId: String(row.client_id ?? row.clientId),
    payload: String(row.payload),
    status: String(row.status) as WebhookQueueJob["status"],
    attemptCount: Number(row.attempt_count ?? row.attemptCount ?? 0),
    maxAttempts: Number(row.max_attempts ?? row.maxAttempts ?? 6),
    nextAttemptAt: String(row.next_attempt_at ?? row.nextAttemptAt),
    lastError:
      row.last_error === null || row.last_error === undefined
        ? null
        : String(row.last_error ?? row.lastError),
    createdAt: String(row.created_at ?? row.createdAt),
    deliveredAt:
      row.delivered_at === null || row.delivered_at === undefined
        ? null
        : String(row.delivered_at ?? row.deliveredAt),
  };
}

const SCHEMA_PATH = path.join(process.cwd(), "src/lib/services/webhook-schema.sql");

function createSqliteDatabase(): WebhookDatabase | null {
  try {
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (filename: string) => WebhookDatabase;
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

type JsonWebhookStore = {
  subscribers: WebhookSubscriber[];
  queue: WebhookQueueJob[];
  deliveryLogs: Array<{
    queueId: string;
    subscriberId: string;
    clientId: string;
    statusCode: number | null;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    createdAt: string;
  }>;
};

function readJsonStore(): JsonWebhookStore {
  if (!fs.existsSync(JSON_STORE_PATH)) {
    return { subscribers: [], queue: [], deliveryLogs: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(JSON_STORE_PATH, "utf8")) as JsonWebhookStore;
  } catch {
    return { subscribers: [], queue: [], deliveryLogs: [] };
  }
}

function writeJsonStore(store: JsonWebhookStore): void {
  fs.mkdirSync(path.dirname(JSON_STORE_PATH), { recursive: true });
  fs.writeFileSync(JSON_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
}

function createSqliteStore(db: WebhookDatabase): WebhookStore {
  return {
    async listActiveSubscribers() {
      const rows = db
        .prepare(
          `SELECT id, client_id, label, url, secret, active, event_kinds, created_at
           FROM webhook_subscribers WHERE active = 1`,
        )
        .all() as Record<string, unknown>[];
      return rows.map(mapSubscriber);
    },
    async upsertSubscriber(input) {
      const now = input.createdAt ?? new Date().toISOString();
      db.prepare(
        `INSERT INTO webhook_subscribers
          (id, client_id, label, url, secret, active, event_kinds, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           client_id = excluded.client_id,
           label = excluded.label,
           url = excluded.url,
           secret = excluded.secret,
           active = excluded.active,
           event_kinds = excluded.event_kinds`,
      ).run(
        input.id,
        input.clientId,
        input.label,
        input.url,
        input.secret,
        input.active ? 1 : 0,
        JSON.stringify(input.eventKinds),
        now,
      );
      return {
        ...input,
        createdAt: now,
      };
    },
    async enqueueJob(input) {
      const now = new Date().toISOString();
      const job: WebhookQueueJob = {
        id: randomUUID(),
        subscriberId: input.subscriberId,
        clientId: input.clientId,
        payload: input.payload,
        status: "pending",
        attemptCount: 0,
        maxAttempts: input.maxAttempts ?? 6,
        nextAttemptAt: now,
        lastError: null,
        createdAt: now,
        deliveredAt: null,
      };
      db.prepare(
        `INSERT INTO webhook_queue
          (id, subscriber_id, client_id, payload, status, attempt_count, max_attempts, next_attempt_at, last_error, created_at, delivered_at)
         VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, NULL, ?, NULL)`,
      ).run(
        job.id,
        job.subscriberId,
        job.clientId,
        job.payload,
        job.maxAttempts,
        job.nextAttemptAt,
        job.createdAt,
      );
      return job;
    },
    async claimDueJobs(limit, nowIso) {
      const rows = db
        .prepare(
          `SELECT id, subscriber_id, client_id, payload, status, attempt_count, max_attempts, next_attempt_at, last_error, created_at, delivered_at
           FROM webhook_queue
           WHERE status IN ('pending', 'failed') AND next_attempt_at <= ?
           ORDER BY created_at ASC
           LIMIT ?`,
        )
        .all(nowIso, limit) as Record<string, unknown>[];
      const jobs = rows.map(mapJob);
      for (const job of jobs) {
        db.prepare(`UPDATE webhook_queue SET status = 'processing' WHERE id = ?`).run(job.id);
      }
      return jobs.map((job) => ({ ...job, status: "processing" as const }));
    },
    async markDelivered(jobId, deliveredAt) {
      db.prepare(
        `UPDATE webhook_queue SET status = 'delivered', delivered_at = ?, last_error = NULL WHERE id = ?`,
      ).run(deliveredAt, jobId);
    },
    async markRetry(job, error, nextAttemptAt) {
      db.prepare(
        `UPDATE webhook_queue
         SET status = 'failed', attempt_count = ?, last_error = ?, next_attempt_at = ?
         WHERE id = ?`,
      ).run(job.attemptCount + 1, error, nextAttemptAt, job.id);
    },
    async markDead(jobId, error) {
      db.prepare(
        `UPDATE webhook_queue SET status = 'dead', last_error = ? WHERE id = ?`,
      ).run(error, jobId);
    },
    async logDelivery(input) {
      db.prepare(
        `INSERT INTO webhook_delivery_logs
          (queue_id, subscriber_id, client_id, status_code, latency_ms, success, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        input.queueId,
        input.subscriberId,
        input.clientId,
        input.statusCode,
        input.latencyMs,
        input.success ? 1 : 0,
        input.errorMessage ?? null,
        new Date().toISOString(),
      );
    },
  };
}

function createJsonStore(): WebhookStore {
  return {
    async listActiveSubscribers() {
      return readJsonStore().subscribers.filter((row) => row.active);
    },
    async upsertSubscriber(input) {
      const store = readJsonStore();
      const now = input.createdAt ?? new Date().toISOString();
      const next: WebhookSubscriber = { ...input, createdAt: now };
      const index = store.subscribers.findIndex((row) => row.id === input.id);
      if (index >= 0) store.subscribers[index] = next;
      else store.subscribers.push(next);
      writeJsonStore(store);
      return next;
    },
    async enqueueJob(input) {
      const store = readJsonStore();
      const now = new Date().toISOString();
      const job: WebhookQueueJob = {
        id: randomUUID(),
        subscriberId: input.subscriberId,
        clientId: input.clientId,
        payload: input.payload,
        status: "pending",
        attemptCount: 0,
        maxAttempts: input.maxAttempts ?? 6,
        nextAttemptAt: now,
        lastError: null,
        createdAt: now,
        deliveredAt: null,
      };
      store.queue.push(job);
      writeJsonStore(store);
      return job;
    },
    async claimDueJobs(limit, nowIso) {
      const store = readJsonStore();
      const due = store.queue
        .filter(
          (job) =>
            (job.status === "pending" || job.status === "failed") &&
            job.nextAttemptAt <= nowIso,
        )
        .slice(0, limit)
        .map((job) => ({ ...job, status: "processing" as const }));
      for (const job of due) {
        const index = store.queue.findIndex((row) => row.id === job.id);
        if (index >= 0) store.queue[index] = job;
      }
      writeJsonStore(store);
      return due;
    },
    async markDelivered(jobId, deliveredAt) {
      const store = readJsonStore();
      const job = store.queue.find((row) => row.id === jobId);
      if (!job) return;
      job.status = "delivered";
      job.deliveredAt = deliveredAt;
      job.lastError = null;
      writeJsonStore(store);
    },
    async markRetry(job, error, nextAttemptAt) {
      const store = readJsonStore();
      const index = store.queue.findIndex((row) => row.id === job.id);
      if (index < 0) return;
      store.queue[index] = {
        ...job,
        status: "failed",
        attemptCount: job.attemptCount + 1,
        lastError: error,
        nextAttemptAt,
      };
      writeJsonStore(store);
    },
    async markDead(jobId, error) {
      const store = readJsonStore();
      const index = store.queue.findIndex((row) => row.id === jobId);
      if (index < 0) return;
      store.queue[index] = {
        ...store.queue[index],
        status: "dead",
        lastError: error,
      };
      writeJsonStore(store);
    },
    async logDelivery(input) {
      const store = readJsonStore();
      store.deliveryLogs.push({
        ...input,
        createdAt: new Date().toISOString(),
      });
      if (store.deliveryLogs.length > 5000) {
        store.deliveryLogs = store.deliveryLogs.slice(-5000);
      }
      writeJsonStore(store);
    },
  };
}

export async function getWebhookStore(): Promise<WebhookStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const sqlite = createSqliteDatabase();
      if (sqlite) return createSqliteStore(sqlite);
      return createJsonStore();
    })();
  }
  return storePromise;
}

export function signWebhookPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function enqueueAnomalyWebhookEvents(
  events: AnomalyDetectedEvent[],
): Promise<number> {
  if (events.length === 0) return 0;
  const store = await getWebhookStore();
  const subscribers = await store.listActiveSubscribers();
  let enqueued = 0;

  for (const subscriber of subscribers) {
    if (!subscriber.eventKinds.includes("ANOMALY_DETECTED")) continue;
    for (const event of events) {
      await store.enqueueJob({
        subscriberId: subscriber.id,
        clientId: subscriber.clientId,
        payload: JSON.stringify(event),
      });
      enqueued += 1;
    }
  }

  return enqueued;
}

export async function upsertWebhookSubscriber(
  input: Omit<WebhookSubscriber, "createdAt"> & { createdAt?: string },
): Promise<WebhookSubscriber> {
  const store = await getWebhookStore();
  return store.upsertSubscriber(input);
}
