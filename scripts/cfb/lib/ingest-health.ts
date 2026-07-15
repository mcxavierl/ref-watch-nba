import * as fs from "node:fs";
import * as path from "node:path";

export const CFB_INGEST_ERROR_LOG = path.join(
  process.cwd(),
  "logs",
  "errors",
  "cfb-ingest.json",
);

export const INGEST_ERROR_TYPES = [
  "Schema Mismatch",
  "Network Timeout",
  "API Change",
  "Other",
] as const;

export type IngestErrorType = (typeof INGEST_ERROR_TYPES)[number];

export type CfbIngestErrorRecord = {
  conference?: string;
  type?: string;
  errorType?: string;
  message?: string;
  gameId?: string;
  timestamp?: string;
  /** When true, kept for audit trail but excluded from active health alerts. */
  resolved?: boolean;
};

export type ConferenceIngestSummary = {
  gamesIngested?: number;
  gamesAttempted?: number;
};

export type CfbIngestLog = {
  generatedAt?: string;
  conferences?: Record<string, ConferenceIngestSummary>;
  errors?: CfbIngestErrorRecord[];
};

export type ConferenceErrorBreakdown = {
  conference: string;
  gamesIngested: number;
  byType: Record<IngestErrorType, number>;
  totalErrors: number;
  schemaMismatchRate: number;
  schemaMismatchAlert: boolean;
};

export type IngestHealthReport = {
  logPath: string;
  generatedAt: string | null;
  conferences: ConferenceErrorBreakdown[];
  alerts: string[];
  healthy: boolean;
  resolvedErrors: number;
};

const SCHEMA_MISMATCH_THRESHOLD = 0.05;

const SCHEMA_PATTERNS =
  /schema|parse|validation|zod|missing field|unexpected token|malformed|type error|cannot read propert|invalid json|required field/i;

const NETWORK_PATTERNS =
  /timeout|etimedout|econnreset|econnrefused|network|socket|fetch failed|aborted|enotfound|503|502|504/i;

const API_CHANGE_PATTERNS =
  /api change|404|not found|deprecated|unknown field|endpoint|structure changed|unexpected response|payload shape|unrecognized/i;

export function classifyIngestError(
  record: CfbIngestErrorRecord,
): IngestErrorType {
  const explicit = normalizeErrorType(record.type ?? record.errorType);
  if (explicit) return explicit;

  const haystack = record.message ?? "";
  if (SCHEMA_PATTERNS.test(haystack)) return "Schema Mismatch";
  if (NETWORK_PATTERNS.test(haystack)) return "Network Timeout";
  if (API_CHANGE_PATTERNS.test(haystack)) return "API Change";
  return "Other";
}

function normalizeErrorType(raw: string | undefined): IngestErrorType | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = INGEST_ERROR_TYPES.find(
    (type) => type.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? null;
}

function emptyTypeCounts(): Record<IngestErrorType, number> {
  return {
    "Schema Mismatch": 0,
    "Network Timeout": 0,
    "API Change": 0,
    Other: 0,
  };
}

export function parseCfbIngestLog(raw: unknown): CfbIngestLog {
  if (!raw || typeof raw !== "object") {
    throw new Error("CFB ingest log must be a JSON object");
  }

  const log = raw as CfbIngestLog;
  if (log.errors != null && !Array.isArray(log.errors)) {
    throw new Error("CFB ingest log `errors` must be an array when present");
  }
  if (log.conferences != null && typeof log.conferences !== "object") {
    throw new Error("CFB ingest log `conferences` must be an object when present");
  }

  return log;
}

/** Errors still requiring attention (resolved entries kept for audit trail). */
export function activeIngestErrors(log: CfbIngestLog): CfbIngestErrorRecord[] {
  return (log.errors ?? []).filter((error) => error.resolved !== true);
}

export function countResolvedIngestErrors(log: CfbIngestLog): number {
  return (log.errors ?? []).filter((error) => error.resolved === true).length;
}

export function loadCfbIngestLog(logPath = CFB_INGEST_ERROR_LOG): CfbIngestLog {
  if (!fs.existsSync(logPath)) {
    throw new Error(`CFB ingest log not found: ${logPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(logPath, "utf8")) as unknown;
  return parseCfbIngestLog(parsed);
}

export function analyzeCfbIngestHealth(
  log: CfbIngestLog,
  logPath = CFB_INGEST_ERROR_LOG,
): IngestHealthReport {
  const conferenceNames = new Set<string>(Object.keys(log.conferences ?? {}));
  for (const error of activeIngestErrors(log)) {
    if (error.conference?.trim()) {
      conferenceNames.add(error.conference.trim());
    }
  }

  if (conferenceNames.size === 0) {
    conferenceNames.add("Unknown");
  }

  const conferences: ConferenceErrorBreakdown[] = [];
  const alerts: string[] = [];

  for (const conference of [...conferenceNames].sort()) {
    const summary = log.conferences?.[conference];
    const gamesIngested =
      summary?.gamesIngested ??
      summary?.gamesAttempted ??
      0;

    const byType = emptyTypeCounts();
    const conferenceErrors = activeIngestErrors(log).filter(
      (error) => (error.conference?.trim() || "Unknown") === conference,
    );

    for (const error of conferenceErrors) {
      const type = classifyIngestError(error);
      byType[type] += 1;
    }

    const totalErrors = conferenceErrors.length;
    const schemaMismatchRate =
      gamesIngested > 0 ? byType["Schema Mismatch"] / gamesIngested : 0;
    const schemaMismatchAlert =
      gamesIngested > 0 &&
      schemaMismatchRate > SCHEMA_MISMATCH_THRESHOLD;

    if (schemaMismatchAlert) {
      alerts.push(
        `${conference}: Schema Mismatch rate ${(schemaMismatchRate * 100).toFixed(1)}% ` +
          `(${byType["Schema Mismatch"]}/${gamesIngested} games) exceeds 5% threshold.`,
      );
    }

    conferences.push({
      conference,
      gamesIngested,
      byType,
      totalErrors,
      schemaMismatchRate,
      schemaMismatchAlert,
    });
  }

  return {
    logPath,
    generatedAt: log.generatedAt ?? null,
    conferences,
    alerts,
    healthy: alerts.length === 0,
    resolvedErrors: countResolvedIngestErrors(log),
  };
}

export function formatIngestHealthReport(report: IngestHealthReport): string {
  const lines: string[] = [];
  lines.push("CFB ingest health check");
  lines.push(`Log: ${report.logPath}`);
  if (report.generatedAt) {
    lines.push(`Generated: ${report.generatedAt}`);
  }
  if (report.resolvedErrors > 0) {
    lines.push(
      `Resolved errors (audit trail, excluded from alerts): ${report.resolvedErrors.toLocaleString("en-US")}`,
    );
  }
  lines.push("");

  for (const row of report.conferences) {
    lines.push(`${row.conference}`);
    lines.push(`  Games ingested: ${row.gamesIngested.toLocaleString("en-US")}`);
    lines.push(`  Total errors: ${row.totalErrors.toLocaleString("en-US")}`);
    for (const type of INGEST_ERROR_TYPES) {
      if (row.byType[type] > 0) {
        lines.push(`    ${type}: ${row.byType[type]}`);
      }
    }
    if (row.gamesIngested > 0) {
      lines.push(
        `  Schema Mismatch rate: ${(row.schemaMismatchRate * 100).toFixed(2)}%`,
      );
    }
    lines.push("");
  }

  if (report.alerts.length > 0) {
    lines.push("⚠ ALERT — schema parser drift detected");
    for (const alert of report.alerts) {
      lines.push(`  • ${alert}`);
    }
    lines.push("");
    lines.push(
      "Suggested recovery: patch the CFB schema parser, then re-run transform-only:",
    );
    lines.push("  npm run build-cfb-data -- --transform-only");
  } else {
    lines.push("No schema mismatch alerts (all conferences at or below 5%).");
  }

  return lines.join("\n");
}
