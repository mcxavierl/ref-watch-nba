import * as fs from "node:fs";
import type {
  NcaaOfficialStatus,
  NcaaSportCode,
} from "../../../src/lib/ncaa-personnel-types";
import type { NcaaIntegrityFailure, NcaaRosterParseResult, NcaaRosterRow } from "./ncaa-roster-types";

const REQUIRED_COLUMNS = [
  "official_id",
  "name",
  "number",
  "conference",
  "primary_region",
  "historical_game_count",
  "status",
] as const;

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseStatus(raw: string): NcaaOfficialStatus | null {
  const value = raw.trim().toLowerCase();
  if (value === "active" || value === "inactive") return value;
  return null;
}

export function parseNcaaOfficialsCsv(
  csv: string,
  sport: NcaaSportCode,
): NcaaRosterParseResult {
  const lines = csv.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  const errors: string[] = [];
  if (lines.length < 2) {
    return { sport, rows: [], errors: ["CSV must include header and at least one row"] };
  }

  const header = parseCsvRow(lines[0] ?? "").map(normalizeHeader);
  for (const column of REQUIRED_COLUMNS) {
    if (!header.includes(column)) {
      errors.push(`Missing required column: ${column}`);
    }
  }
  if (errors.length > 0) {
    return { sport, rows: [], errors };
  }

  const index = (name: (typeof REQUIRED_COLUMNS)[number]) => header.indexOf(name);
  const rows: NcaaRosterRow[] = [];

  for (let r = 1; r < lines.length; r++) {
    const fields = parseCsvRow(lines[r] ?? "");
    const officialId = fields[index("official_id")] ?? "";
    const name = fields[index("name")] ?? "";
    const numberRaw = fields[index("number")] ?? "";
    const conference = fields[index("conference")] ?? "";
    const primaryRegion = fields[index("primary_region")] ?? "";
    const gamesRaw = fields[index("historical_game_count")] ?? "";
    const statusRaw = fields[index("status")] ?? "";

    const number = Number.parseInt(numberRaw, 10);
    const historicalGameCount = Number.parseInt(gamesRaw, 10);
    const status = parseStatus(statusRaw);

    if (!name.trim()) {
      errors.push(`Row ${r + 1}: name is required`);
      continue;
    }
    if (!Number.isFinite(number)) {
      errors.push(`Row ${r + 1}: invalid number for ${name}`);
      continue;
    }
    if (!Number.isFinite(historicalGameCount) || historicalGameCount < 0) {
      errors.push(`Row ${r + 1}: invalid historical_game_count for ${name}`);
      continue;
    }
    if (!status) {
      errors.push(`Row ${r + 1}: status must be active or inactive`);
      continue;
    }

    rows.push({
      officialId: officialId.trim(),
      name: name.trim(),
      number,
      conference: conference.trim() || "Other",
      primaryRegion: primaryRegion.trim() || "National",
      historicalGameCount,
      status,
    });
  }

  return { sport, rows, errors };
}

export function validateNcaaRosterIntegrity(
  rows: NcaaRosterRow[],
): { valid: boolean; failures: NcaaIntegrityFailure[] } {
  const failures: NcaaIntegrityFailure[] = [];
  const seenIds = new Set<string>();

  rows.forEach((row, index) => {
    const reasons: string[] = [];
    if (!row.officialId) {
      reasons.push("official_id is empty");
    }
    if (row.status === "active" && !row.officialId) {
      reasons.push("active officials require non-null official_id");
    }
    if (row.officialId && seenIds.has(row.officialId)) {
      reasons.push(`duplicate official_id: ${row.officialId}`);
    }
    if (row.officialId) seenIds.add(row.officialId);

    if (reasons.length > 0) {
      failures.push({
        row: index + 2,
        officialId: row.officialId || "(missing)",
        reasons,
      });
    }
  });

  return { valid: failures.length === 0, failures };
}

export function readNcaaOfficialsCsv(
  filePath: string,
  sport: NcaaSportCode,
): NcaaRosterParseResult {
  if (!fs.existsSync(filePath)) {
    return { sport, rows: [], errors: [`File not found: ${filePath}`] };
  }
  const csv = fs.readFileSync(filePath, "utf8");
  return parseNcaaOfficialsCsv(csv, sport);
}
