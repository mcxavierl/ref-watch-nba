import * as fs from "node:fs";
import * as path from "node:path";
import {
  CFB_INGEST_ERROR_LOG,
  type CfbIngestErrorRecord,
  type CfbIngestLog,
} from "./ingest-health";

const LOG_DIR = path.join(process.cwd(), "logs", "errors");

export type IngestLogWriter = {
  logConference: (conference: string, gamesIngested: number, gamesAttempted?: number) => void;
  logError: (record: CfbIngestErrorRecord) => void;
  flush: () => void;
};

export function createIngestLogWriter(): IngestLogWriter {
  const conferences: CfbIngestLog["conferences"] = {};
  const errors: CfbIngestErrorRecord[] = [];

  return {
    logConference(conference, gamesIngested, gamesAttempted) {
      conferences[conference] = {
        gamesIngested,
        gamesAttempted: gamesAttempted ?? gamesIngested,
      };
    },
    logError(record) {
      errors.push(record);
    },
    flush() {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      const payload: CfbIngestLog = {
        generatedAt: new Date().toISOString(),
        conferences,
        errors,
      };
      fs.writeFileSync(CFB_INGEST_ERROR_LOG, `${JSON.stringify(payload, null, 2)}\n`);
    },
  };
}

export function logOfficialsMissing(
  writer: IngestLogWriter,
  gameId: string,
  conference: string,
): void {
  writer.logError({
    conference,
    type: "Other",
    errorType: "Officials Missing",
    message: "ESPN summary returned no officials for this game",
    gameId,
    timestamp: new Date().toISOString(),
    resolved: false,
  });
}
