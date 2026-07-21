import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { CitationEventPayload } from "@/lib/intelligence/intelligence-card-types";

export type CitationEventRecord = CitationEventPayload & {
  id: string;
  createdAt: string;
};

const JSON_STORE_PATH = path.join(process.cwd(), "data/citation-events.json");

type CitationStoreFile = {
  events: CitationEventRecord[];
};

function readStore(): CitationStoreFile {
  if (!fs.existsSync(JSON_STORE_PATH)) {
    return { events: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(JSON_STORE_PATH, "utf8")) as CitationStoreFile;
    return { events: parsed.events ?? [] };
  } catch {
    return { events: [] };
  }
}

function writeStore(store: CitationStoreFile): void {
  fs.mkdirSync(path.dirname(JSON_STORE_PATH), { recursive: true });
  fs.writeFileSync(JSON_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
}

export function persistCitationEvent(payload: CitationEventPayload): CitationEventRecord {
  const store = readStore();
  const record: CitationEventRecord = {
    ...payload,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.events.push(record);
  if (store.events.length > 10_000) {
    store.events = store.events.slice(-10_000);
  }
  writeStore(store);
  return record;
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
