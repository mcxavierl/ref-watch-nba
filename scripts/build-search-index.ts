#!/usr/bin/env npx tsx
/**
 * Build a slim ref + team search index for the global command palette.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { filterNcaaRefStats } from "../src/lib/ncaa-conference-gate";
import { LEAGUE_MANIFEST, type LeagueManifestId } from "../src/lib/league-manifest";
import { leagueManifestPath } from "../src/lib/league-manifest";
import type { RefStatsFile } from "../src/lib/types";
import { CBB_TEAMS, teamFullName as cbbTeamFullName } from "../src/lib/cbb/teams";
import { CFB_TEAMS, teamFullName as cfbTeamFullName } from "../src/lib/cfb/teams";
import { EPL_TEAMS, teamFullName as eplTeamFullName } from "../src/lib/epl/teams";
import { LALIGA_TEAMS, teamFullName as laligaTeamFullName } from "../src/lib/laliga/teams";
import { NFL_TEAMS, teamFullName as nflTeamFullName } from "../src/lib/nfl/teams";
import { NHL_TEAMS, teamFullName as nhlTeamFullName } from "../src/lib/nhl/teams";
import { NBA_TEAMS, teamFullName as nbaTeamFullName } from "../src/lib/teams";

import type {
  CommandPaletteIndex,
  CommandPaletteRefEntry,
  CommandPaletteTeamEntry,
} from "../src/lib/command-palette-types";

const SEARCH_LEAGUE_IDS = [
  "nba",
  "nfl",
  "nhl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
] as const satisfies readonly LeagueManifestId[];

const REF_STATS_PATHS: Record<(typeof SEARCH_LEAGUE_IDS)[number], string> = {
  nba: "data/ref-stats-core.json",
  nfl: "data/nfl/ref-stats-core.json",
  nhl: "data/nhl/ref-stats-core.json",
  epl: "data/epl/ref-stats-core.json",
  laliga: "data/laliga/ref-stats-core.json",
  cbb: "data/cbb/ref-stats-core.json",
  cfb: "data/cfb/ref-stats-core.json",
};

const TEAM_LISTS: Record<
  (typeof SEARCH_LEAGUE_IDS)[number],
  { abbr: string; label: string }[]
> = {
  nba: NBA_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: nbaTeamFullName(team),
  })),
  nfl: NFL_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: nflTeamFullName(team),
  })),
  nhl: NHL_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: nhlTeamFullName(team),
  })),
  epl: EPL_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: eplTeamFullName(team),
  })),
  laliga: LALIGA_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: laligaTeamFullName(team),
  })),
  cbb: CBB_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: cbbTeamFullName(team),
  })),
  cfb: CFB_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: cfbTeamFullName(team),
  })),
};

function loadRefStats(root: string, leagueId: (typeof SEARCH_LEAGUE_IDS)[number]): RefStatsFile | null {
  const statsPath = path.join(root, REF_STATS_PATHS[leagueId]);
  if (!fs.existsSync(statsPath)) return null;
  let data = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
  if (leagueId === "cbb" || leagueId === "cfb") {
    data = filterNcaaRefStats(data, leagueId);
  }
  return data;
}

export function buildCommandPaletteIndex(root = process.cwd()): CommandPaletteIndex {
  const refs: CommandPaletteRefEntry[] = [];
  const teams: CommandPaletteTeamEntry[] = [];

  for (const leagueId of SEARCH_LEAGUE_IDS) {
    const manifest = LEAGUE_MANIFEST[leagueId];
    const stats = loadRefStats(root, leagueId);
    if (stats?.refs?.length) {
      for (const ref of stats.refs) {
        if (!ref.slug || !ref.name) continue;
        refs.push({
          leagueId,
          leagueLabel: manifest.shortLabel,
          slug: ref.slug,
          name: ref.name,
          games: ref.games,
          href: leagueManifestPath(leagueId, `/refs/${ref.slug}`),
        });
      }
    }

    for (const team of TEAM_LISTS[leagueId]) {
      teams.push({
        leagueId,
        leagueLabel: manifest.shortLabel,
        abbr: team.abbr,
        label: team.label,
        href: leagueManifestPath(leagueId, `/teams/${team.abbr}`),
      });
    }
  }

  refs.sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
  teams.sort(
    (a, b) =>
      a.leagueLabel.localeCompare(b.leagueLabel) ||
      a.label.localeCompare(b.label),
  );

  return {
    generatedAt: new Date().toISOString(),
    refs,
    teams,
  };
}

export function writeCommandPaletteIndex(root = process.cwd()): CommandPaletteIndex {
  const index = buildCommandPaletteIndex(root);
  const payload = `${JSON.stringify(index, null, 2)}\n`;

  const dataPath = path.join(root, "data", "search-index.json");
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, payload);

  const publicPath = path.join(root, "public", "data", "search-index.json");
  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.writeFileSync(publicPath, payload);

  console.log(
    `Wrote command palette index (${index.refs.length} refs, ${index.teams.length} teams)`,
  );
  return index;
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    writeCommandPaletteIndex();
  }
}
