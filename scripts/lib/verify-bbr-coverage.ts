import * as fs from "node:fs";
import * as path from "node:path";
import {
  countBbrRefTeamPairs,
  type BbrRefTeamRecordsFile,
} from "../../src/lib/bbr-ref-team-records";
import type { RefStatsFile } from "../../src/lib/types";

const EXPECTED_TEAM_SEASONS = 150;

export interface BbrCoverageResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  entryCount: number;
  refTeamPairs: number;
  refTeamWinLossSource?: string;
}

export function verifyBbrCoverage(root?: string): BbrCoverageResult {
  const r = root ?? process.cwd();
  const errors: string[] = [];
  const warnings: string[] = [];

  const fixturePath = path.join(r, "data", "bbr-ref-team-records.json");
  let fixture: BbrRefTeamRecordsFile | null = null;
  try {
    fixture = JSON.parse(
      fs.readFileSync(fixturePath, "utf8"),
    ) as BbrRefTeamRecordsFile;
  } catch {
    errors.push("Missing data/bbr-ref-team-records.json");
    return { ok: false, errors, warnings, entryCount: 0, refTeamPairs: 0 };
  }

  const entryCount = fixture.entries.length;
  const refTeamPairs = countBbrRefTeamPairs(fixture);

  if (entryCount !== EXPECTED_TEAM_SEASONS) {
    errors.push(
      `BBR fixture has ${entryCount}/${EXPECTED_TEAM_SEASONS} team-season entries`,
    );
  }

  const keys = new Set(
    fixture.entries.map((entry) => `${entry.team}|${entry.season}`),
  );
  for (const team of fixture.teams) {
    for (const season of fixture.seasons) {
      if (!keys.has(`${team}|${season}`)) {
        errors.push(`BBR fixture missing ${team} ${season}`);
      }
    }
  }

  const empty = fixture.entries.filter(
    (entry) => !entry.referees || entry.referees.length === 0,
  );
  if (empty.length > 0) {
    errors.push(
      `BBR fixture has ${empty.length} team-season(s) with no referee rows`,
    );
  }

  if (refTeamPairs < 1000) {
    warnings.push(
      `BBR fixture has only ${refTeamPairs} ref×team pairs (expected >1000)`,
    );
  }

  let refTeamWinLossSource: string | undefined;
  const statsPath = path.join(r, "data", "ref-stats.json");
  try {
    const stats = JSON.parse(
      fs.readFileSync(statsPath, "utf8"),
    ) as RefStatsFile;
    refTeamWinLossSource = stats.meta.refTeamWinLossSource;
    if (refTeamWinLossSource !== "basketball-reference") {
      errors.push(
        `ref-stats.json meta.refTeamWinLossSource is "${refTeamWinLossSource ?? "unset"}" (expected "basketball-reference")`,
      );
    }
  } catch {
    warnings.push("Could not read data/ref-stats.json for BBR overlay check");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    entryCount,
    refTeamPairs,
    refTeamWinLossSource,
  };
}
