import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AnomalyType,
  DetectedAnomaly,
  RollingWindow,
  SeverityLevel,
} from "@/lib/analytics/anomalyEngine";

export type AnomalyEvidenceRecord = {
  id: string;
  gameId: string;
  anomalyType: AnomalyType;
  severityScore: number;
  severityLevel: SeverityLevel;
  zScore: number;
  rollingWindowUsed: RollingWindow;
  evidencePayload: Record<string, unknown>;
  createdAt: string;
};

type AnomalyEvidenceDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number };
  };
};

const SQLITE_DB_PATH = path.join(process.cwd(), "data/api-keys.db");
const JSON_STORE_PATH = path.join(process.cwd(), "data/anomaly-evidence-store.json");

let storePromise: Promise<AnomalyEvidenceStore> | null = null;

export type AnomalyEvidenceStore = {
  persist(record: AnomalyEvidenceRecord): Promise<AnomalyEvidenceRecord>;
  persistBatch(records: AnomalyEvidenceRecord[]): Promise<number>;
};

function createSqliteDatabase(): AnomalyEvidenceDatabase | null {
  try {
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (filename: string) => AnomalyEvidenceDatabase;
    };
    fs.mkdirSync(path.dirname(SQLITE_DB_PATH), { recursive: true });
    const db = new DatabaseSync(SQLITE_DB_PATH);
    db.exec(fs.readFileSync(path.join(process.cwd(), "src/lib/auth/api-key-schema.sql"), "utf8"));
    db.exec(fs.readFileSync(path.join(process.cwd(), "src/lib/services/anomaly-schema.sql"), "utf8"));
    return db;
  } catch {
    return null;
  }
}

function readJsonStore(): AnomalyEvidenceRecord[] {
  if (!fs.existsSync(JSON_STORE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(JSON_STORE_PATH, "utf8")) as AnomalyEvidenceRecord[];
  } catch {
    return [];
  }
}

function writeJsonStore(records: AnomalyEvidenceRecord[]): void {
  fs.mkdirSync(path.dirname(JSON_STORE_PATH), { recursive: true });
  fs.writeFileSync(JSON_STORE_PATH, `${JSON.stringify(records, null, 2)}\n`);
}

function createSqliteStore(db: AnomalyEvidenceDatabase): AnomalyEvidenceStore {
  return {
    async persist(record) {
      db.prepare(
        `INSERT INTO anomaly_evidence_store
          (id, game_id, anomaly_type, severity_score, severity_level, z_score, rolling_window_used, evidence_payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        record.id,
        record.gameId,
        record.anomalyType,
        record.severityScore,
        record.severityLevel,
        record.zScore,
        record.rollingWindowUsed,
        JSON.stringify(record.evidencePayload),
        record.createdAt,
      );
      return record;
    },
    async persistBatch(records) {
      for (const record of records) {
        await this.persist(record);
      }
      return records.length;
    },
  };
}

function createJsonStore(): AnomalyEvidenceStore {
  return {
    async persist(record) {
      const store = readJsonStore();
      store.push(record);
      if (store.length > 10_000) {
        writeJsonStore(store.slice(-10_000));
      } else {
        writeJsonStore(store);
      }
      return record;
    },
    async persistBatch(records) {
      const store = readJsonStore();
      store.push(...records);
      if (store.length > 10_000) {
        writeJsonStore(store.slice(-10_000));
      } else {
        writeJsonStore(store);
      }
      return records.length;
    },
  };
}

export async function getAnomalyEvidenceStore(): Promise<AnomalyEvidenceStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const sqlite = createSqliteDatabase();
      if (sqlite) return createSqliteStore(sqlite);
      return createJsonStore();
    })();
  }
  return storePromise;
}

export function toEvidenceRecord(anomaly: DetectedAnomaly): AnomalyEvidenceRecord {
  return {
    id: anomaly.id || randomUUID(),
    gameId: anomaly.gameId,
    anomalyType: anomaly.type,
    severityScore: anomaly.severityScore,
    severityLevel: anomaly.severityLevel,
    zScore: anomaly.zScore,
    rollingWindowUsed: anomaly.rollingWindowUsed,
    evidencePayload: {
      ...anomaly.evidence,
      summary: anomaly.summary,
      leagueId: anomaly.leagueId,
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Persist anomalies to the evidence store BEFORE outbound webhook dispatch.
 */
export async function persistAnomalyEvidence(
  anomalies: DetectedAnomaly[],
): Promise<AnomalyEvidenceRecord[]> {
  if (anomalies.length === 0) return [];
  const store = await getAnomalyEvidenceStore();
  const records = anomalies.map(toEvidenceRecord);
  await store.persistBatch(records);
  return records;
}
