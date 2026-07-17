import * as fs from "node:fs";
import * as path from "node:path";
import {
  LIVE_NCAA_CONFERENCES,
  resolveTeamConference,
} from "../../src/lib/ncaa-conference-gate";
import { countDistinctGamesByConference } from "../../src/lib/ncaa-conference-coverage";
import type { CbbConferenceCoverageSnapshot } from "../../src/lib/cbb/conference-coverage-preload";

export function buildCbbConferenceCoverageSnapshot(
  root: string,
): CbbConferenceCoverageSnapshot | null {
  const logsPath = path.join(root, "data", "cbb", "game-logs.json");
  if (!fs.existsSync(logsPath)) return null;

  const parsed = JSON.parse(fs.readFileSync(logsPath, "utf8")) as {
    games?: { gameId: string; homeTeam: string; awayTeam: string }[];
  };
  const games = parsed.games ?? [];
  if (games.length === 0) return null;

  const distinctByConference = countDistinctGamesByConference(
    games,
    (teamAbbr) => {
      const territory = resolveTeamConference("cbb", teamAbbr);
      if (
        !territory ||
        !LIVE_NCAA_CONFERENCES.includes(
          territory as (typeof LIVE_NCAA_CONFERENCES)[number],
        )
      ) {
        return null;
      }
      return territory as (typeof LIVE_NCAA_CONFERENCES)[number];
    },
    LIVE_NCAA_CONFERENCES,
  );

  return {
    generatedAt: new Date().toISOString(),
    distinctByConference,
  };
}

export function writeCbbConferenceCoverageSnapshot(root: string): boolean {
  const snapshot = buildCbbConferenceCoverageSnapshot(root);
  if (!snapshot) return false;

  const payload = `${JSON.stringify(snapshot)}\n`;
  for (const rel of ["data/cbb/conference-coverage.json", "public/data/cbb/conference-coverage.json"]) {
    const dest = path.join(root, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, payload);
  }

  console.log(
    `Wrote CBB conference coverage snapshot (${Object.values(snapshot.distinctByConference).join(", ")} games per conf)`,
  );

  for (const rel of [
    "data/cbb/ref-stats.json",
    "data/cbb/ref-stats-core.json",
    "public/data/cbb/ref-stats.json",
  ]) {
    const statsPath = path.join(root, rel);
    if (!fs.existsSync(statsPath)) continue;
    const stats = JSON.parse(fs.readFileSync(statsPath, "utf8")) as {
      meta?: Record<string, unknown>;
    };
    stats.meta = {
      ...stats.meta,
      conferenceCoverageDistinctGames: snapshot.distinctByConference,
    };
    fs.writeFileSync(statsPath, `${JSON.stringify(stats)}\n`);
  }

  return true;
}
