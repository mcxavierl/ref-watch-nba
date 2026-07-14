#!/usr/bin/env npx tsx
/**
 * Build league personnel sidecars (coaches + star players) for friction matrix joins.
 * NBA coaches from BBR cache; NFL/NHL from curated seeds; trends from game logs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  NBA_STAR_SEEDS,
  nflPersonnelSeeds,
  nhlPersonnelSeeds,
  starTierPercentile,
  type SeedCoach,
  type SeedStar,
} from "./lib/personnel-seeds";

const ROOT = process.cwd();
const BBR_CACHE = path.join(ROOT, "data", "bbr-cache");

const BBR_TO_NBA: Record<string, string> = {
  BRK: "BKN",
  CHO: "CHA",
  PHO: "PHX",
  NOH: "NOP",
  NOK: "NOP",
  NJN: "BKN",
};

type GameRow = {
  season: string;
  homeTeam: string;
  awayTeam: string;
  totalFouls: number;
  homeFlags?: number;
  awayFlags?: number;
  homeMinors?: number;
  awayMinors?: number;
  personnel?: {
    homeTechnicalFouls?: number;
    awayTechnicalFouls?: number;
  };
};

interface CoachProfileOut extends SeedCoach {
  careerAvgWhistleEvents?: number;
  gamesSampled?: number;
}

interface StarPlayerProfileOut extends SeedStar {
  starTierPercentile?: number;
  gamesSampled?: number;
}

interface PersonnelProfileFile {
  lastUpdated: string;
  league: string;
  coaches: CoachProfileOut[];
  starPlayers: StarPlayerProfileOut[];
}

function bbrSeasonFromFileYear(year: number): string {
  return `${year - 1}-${String(year).slice(-2)}`;
}

function parseCoachFromMarkdown(
  content: string,
): { coachId: string; name: string } | null {
  const match = content.match(
    /\*\*Coach:\*\*\[([^\]]+)\]\([^)]*\/coaches\/([a-z0-9]+)\.html\)/i,
  );
  if (!match) return null;
  return { name: match[1].trim(), coachId: match[2].trim() };
}

function parseTeamFromFilename(filename: string): string | null {
  const match = filename.match(/^([A-Z]{3})_(\d{4})\.md$/);
  if (!match) return null;
  return BBR_TO_NBA[match[1]] ?? match[1];
}

function parseYearFromFilename(filename: string): number | null {
  const match = filename.match(/_(\d{4})\.md$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function collectNbaCoaches(): SeedCoach[] {
  const coaches: SeedCoach[] = [];
  if (!fs.existsSync(BBR_CACHE)) return coaches;

  for (const file of fs.readdirSync(BBR_CACHE)) {
    if (!file.endsWith(".md")) continue;
    const team = parseTeamFromFilename(file);
    const year = parseYearFromFilename(file);
    if (!team || !year) continue;

    const content = fs.readFileSync(path.join(BBR_CACHE, file), "utf8");
    const coach = parseCoachFromMarkdown(content);
    if (!coach) continue;

    coaches.push({
      coachId: coach.coachId,
      name: coach.name,
      team,
      season: bbrSeasonFromFileYear(year),
    });
  }

  return coaches;
}

function loadGameLogs(
  league: "NBA" | "NFL" | "NHL",
): GameRow[] {
  const candidates = [
    path.join(ROOT, "data", league.toLowerCase(), "game-logs.json"),
    path.join(ROOT, "public", "data", league.toLowerCase(), "game-logs.json"),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
        games: GameRow[];
      };
      return parsed.games ?? [];
    } catch {
      continue;
    }
  }
  return [];
}

function coachWhistleForGame(
  game: GameRow,
  team: string,
  league: "NBA" | "NFL" | "NHL",
): number {
  const isHome = game.homeTeam.toUpperCase() === team.toUpperCase();
  if (league === "NFL") {
    return isHome ? (game.homeFlags ?? 0) : (game.awayFlags ?? 0);
  }
  if (league === "NHL") {
    return isHome ? (game.homeMinors ?? 0) : (game.awayMinors ?? 0);
  }
  if (isHome && game.personnel?.homeTechnicalFouls !== undefined) {
    return game.personnel.homeTechnicalFouls;
  }
  if (!isHome && game.personnel?.awayTechnicalFouls !== undefined) {
    return game.personnel.awayTechnicalFouls;
  }
  return 0;
}

function playerDrawnProxyForGame(
  game: GameRow,
  team: string,
  league: "NBA" | "NFL" | "NHL",
): number {
  const isHome = game.homeTeam.toUpperCase() === team.toUpperCase();
  if (league === "NFL") {
    return isHome ? (game.awayFlags ?? 0) : (game.homeFlags ?? 0);
  }
  if (league === "NHL") {
    return isHome ? (game.awayMinors ?? 0) : (game.homeMinors ?? 0);
  }
  return game.totalFouls / 2;
}

function enrichCoachTrends(
  coaches: SeedCoach[],
  games: GameRow[],
  league: "NBA" | "NFL" | "NHL",
): CoachProfileOut[] {
  return coaches.map((profile) => {
    const teamGames = games.filter(
      (game) =>
        game.season === profile.season &&
        (game.homeTeam.toUpperCase() === profile.team ||
          game.awayTeam.toUpperCase() === profile.team),
    );
    if (teamGames.length === 0) return { ...profile };

    const whistleSum = teamGames.reduce(
      (sum, game) => sum + coachWhistleForGame(game, profile.team, league),
      0,
    );

    return {
      ...profile,
      careerAvgWhistleEvents: whistleSum / teamGames.length,
      gamesSampled: teamGames.length,
    };
  });
}

function enrichStarTrends(
  stars: SeedStar[],
  games: GameRow[],
  league: "NBA" | "NFL" | "NHL",
): StarPlayerProfileOut[] {
  return stars.map((profile) => {
    const teamGames = games.filter(
      (game) =>
        game.season === profile.season &&
        (game.homeTeam.toUpperCase() === profile.team ||
          game.awayTeam.toUpperCase() === profile.team),
    );
    const drawnSum = teamGames.reduce(
      (sum, game) => sum + playerDrawnProxyForGame(game, profile.team, league),
      0,
    );
    const derivedDrawn =
      teamGames.length > 0 ? drawnSum / teamGames.length : undefined;

    return {
      ...profile,
      starTierPercentile: starTierPercentile(profile.usageRank),
      seasonAvgFoulsDrawn:
        profile.seasonAvgFoulsDrawn ?? derivedDrawn,
      gamesSampled: teamGames.length > 0 ? teamGames.length : undefined,
    };
  });
}

function writeProfile(
  outPath: string,
  league: string,
  coaches: CoachProfileOut[],
  starPlayers: StarPlayerProfileOut[],
): void {
  const payload: PersonnelProfileFile = {
    lastUpdated: new Date().toISOString(),
    league,
    coaches,
    starPlayers,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function buildNba(): void {
  const games = loadGameLogs("NBA");
  const coaches = enrichCoachTrends(collectNbaCoaches(), games, "NBA");
  const starPlayers = enrichStarTrends(NBA_STAR_SEEDS, games, "NBA");
  const outPath = path.join(ROOT, "data", "nba", "personnel-profiles.json");
  writeProfile(outPath, "NBA", coaches, starPlayers);
  console.log(
    `NBA: ${coaches.length} coaches, ${starPlayers.length} stars → ${outPath}`,
  );
}

function buildNfl(): void {
  const games = loadGameLogs("NFL");
  const seeds = nflPersonnelSeeds();
  const coaches = enrichCoachTrends(seeds.coaches, games, "NFL");
  const starPlayers = enrichStarTrends(seeds.starPlayers, games, "NFL");
  const outPath = path.join(ROOT, "data", "nfl", "personnel-profiles.json");
  writeProfile(outPath, "NFL", coaches, starPlayers);
  console.log(
    `NFL: ${coaches.length} coaches, ${starPlayers.length} stars → ${outPath}`,
  );
}

function buildNhl(): void {
  const games = loadGameLogs("NHL");
  const seeds = nhlPersonnelSeeds();
  const coaches = enrichCoachTrends(seeds.coaches, games, "NHL");
  const starPlayers = enrichStarTrends(seeds.starPlayers, games, "NHL");
  const outPath = path.join(ROOT, "data", "nhl", "personnel-profiles.json");
  writeProfile(outPath, "NHL", coaches, starPlayers);
  console.log(
    `NHL: ${coaches.length} coaches, ${starPlayers.length} stars → ${outPath}`,
  );
}

function main(): void {
  buildNba();
  buildNfl();
  buildNhl();
}

main();
