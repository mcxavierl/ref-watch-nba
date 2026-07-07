import * as fs from "node:fs";
import * as path from "node:path";
import type { TeamCrewSplit } from "../src/lib/types";
import { NBA_TEAM_ABBRS } from "../src/lib/teams";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function hash(abbr: string, crewKey: string): number {
  let h = 0;
  for (const c of abbr + crewKey) {
    h = (h * 31 + c.charCodeAt(0)) | 0;
  }
  return Math.abs(h);
}

function perturbSplit(
  template: TeamCrewSplit,
  abbr: string,
): TeamCrewSplit {
  const h = hash(abbr, template.crewKey);
  const totalShift = ((h % 11) - 5) * 0.6;
  const foulShift = ((h % 9) - 4) * 0.3;
  const diffShift = ((h % 7) - 3) * 0.4;
  const games = Math.max(3, template.games + ((h % 3) - 1));
  const wins = Math.min(
    games,
    Math.max(0, Math.round(template.wins + ((h % 5) - 2))),
  );
  const homeGames = Math.max(1, Math.round(games * (0.4 + (h % 5) * 0.04)));
  const awayGames = games - homeGames;
  const homeWins = Math.min(homeGames, Math.round(wins * 0.55));
  const awayWins = wins - homeWins;

  const avgTotal = round1(template.avgTotalPoints + totalShift);
  const avgFouls = round1(template.avgFouls + foulShift);
  const avgTeamFouls = round1(template.avgTeamFouls + foulShift * 0.6);
  const avgOpponentFouls = round1(template.avgOpponentFouls + foulShift * 0.4);
  const foulDifferential = round1(avgTeamFouls - avgOpponentFouls);
  const overRate = round3(
    Math.min(0.85, Math.max(0.15, template.overRate + diffShift * 0.02)),
  );

  return {
    ...template,
    games,
    avgTotalPoints: avgTotal,
    overRate,
    avgFouls,
    wins,
    losses: games - wins,
    totalDelta: round1(avgTotal - 225),
    homeGames,
    awayGames,
    homeWins,
    homeLosses: homeGames - homeWins,
    awayWins,
    awayLosses: awayGames - awayWins,
    avgTeamFouls,
    avgOpponentFouls,
    foulDifferential,
  };
}

function main() {
  const dataDir = path.join(process.cwd(), "data");
  const seedPath = path.join(dataDir, "ref-stats.seed.json");
  const raw = JSON.parse(fs.readFileSync(seedPath, "utf8")) as {
    raptorsSplits?: TeamCrewSplit[];
    lakersSplits?: TeamCrewSplit[];
    teamSplits?: Record<string, TeamCrewSplit[]>;
    [key: string]: unknown;
  };

  const torSplits = raw.raptorsSplits ?? raw.teamSplits?.TOR ?? [];
  const lalSplits = raw.lakersSplits ?? raw.teamSplits?.LAL ?? [];
  const templates = [...torSplits, ...lalSplits];

  const uniqueByCrew = new Map<string, TeamCrewSplit>();
  for (const split of templates) {
    if (!uniqueByCrew.has(split.crewKey)) {
      uniqueByCrew.set(split.crewKey, split);
    }
  }
  const crewTemplates = [...uniqueByCrew.values()].slice(0, 8);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};

  for (const abbr of NBA_TEAM_ABBRS) {
    if (abbr === "TOR") {
      teamSplits.TOR = torSplits;
      continue;
    }
    if (abbr === "LAL") {
      teamSplits.LAL = lalSplits;
      continue;
    }

    const count = 3 + (hash(abbr, "count") % 3);
    const picked = crewTemplates
      .map((t, i) => ({ t, score: hash(abbr, t.crewKey) + i }))
      .sort((a, b) => a.score - b.score)
      .slice(0, count)
      .map(({ t }) => perturbSplit(t, abbr))
      .sort((a, b) => b.games - a.games);

    teamSplits[abbr] = picked;
  }

  const next = { ...raw, teamSplits };
  delete next.raptorsSplits;
  delete next.lakersSplits;

  fs.writeFileSync(seedPath, `${JSON.stringify(next, null, 2)}\n`);

  const statsPath = path.join(dataDir, "ref-stats.json");
  if (fs.existsSync(statsPath)) {
    const statsRaw = JSON.parse(fs.readFileSync(statsPath, "utf8")) as Record<
      string,
      unknown
    >;
    fs.writeFileSync(
      statsPath,
      `${JSON.stringify({ ...statsRaw, teamSplits }, null, 2)}\n`,
    );
  }

  console.log(
    `Wrote teamSplits for ${Object.keys(teamSplits).length} teams to seed (and ref-stats if present).`,
  );
}

main();
