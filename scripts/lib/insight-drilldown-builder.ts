import * as fs from "node:fs";
import * as path from "node:path";
import type { LeagueInsightCard } from "../../src/lib/league-overview-insights";
import {
  insightDrilldownId,
  type InsightCrewPartner,
  type InsightDrilldownGame,
  type InsightDrilldownPayload,
  type InsightVenueSplit,
} from "../../src/lib/insight-drilldown-types";
import type { RuntimeGameLogEntry } from "../../src/lib/game-logs-preload";
import { LEAGUES, type LeagueId } from "../../src/lib/leagues";

const DATA_LEAGUE: Record<
  (typeof import("../../src/lib/league-verification").VERIFIED_LIVE_LEAGUE_IDS)[number],
  RuntimeGameLogEntry["league"]
> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
};

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function loadNbaGameLogs(root: string): RuntimeGameLogEntry[] {
  const shardDir = path.join(root, "data", "nba", "game-logs");
  if (fs.existsSync(shardDir)) {
    const games: RuntimeGameLogEntry[] = [];
    for (const file of fs.readdirSync(shardDir).filter((f) => f.endsWith(".ndjson"))) {
      const raw = fs.readFileSync(path.join(shardDir, file), "utf8").trim();
      if (!raw) continue;
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        games.push(JSON.parse(line) as RuntimeGameLogEntry);
      }
    }
    if (games.length > 0) return games;
  }

  const legacy = readJson<{ games: RuntimeGameLogEntry[] }>(
    path.join(root, "data", "game-logs.json"),
  );
  return legacy?.games ?? [];
}

function loadLeagueGameLogs(
  root: string,
  leagueId: LeagueId,
): RuntimeGameLogEntry[] {
  if (leagueId === "nba") return loadNbaGameLogs(root);

  const filePath =
    leagueId === "nhl"
      ? path.join(root, "data", "nhl", "game-logs.json")
      : leagueId === "nfl"
        ? path.join(root, "data", "nfl", "game-logs.json")
        : leagueId === "epl"
          ? path.join(root, "data", "epl", "game-logs.json")
          : path.join(root, "data", "laliga", "game-logs.json");

  const file = readJson<{ games: RuntimeGameLogEntry[] }>(filePath);
  return file?.games ?? [];
}

function whistleLabelForLeague(leagueId: LeagueId): string {
  return LEAGUES[leagueId].metrics.whistleShort;
}

function whistleCountForGame(
  leagueId: LeagueId,
  game: RuntimeGameLogEntry,
  isHome: boolean,
): number {
  if (leagueId === "nhl") {
    return isHome ? (game.homeMinors ?? 0) + (game.awayMinors ?? 0) : (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  if (leagueId === "nfl") {
    return isHome
      ? (game.homeFlags ?? 0) + (game.awayFlags ?? 0)
      : (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  return game.totalFouls;
}

function spreadCoveredForTeam(
  game: RuntimeGameLogEntry,
  isHome: boolean,
): boolean | null {
  if (game.lineSource === "synthetic" || !Number.isFinite(game.homeSpread)) {
    return null;
  }
  const margin = isHome
    ? game.homeScore - game.awayScore
    : game.awayScore - game.homeScore;
  const adjusted = isHome ? margin + game.homeSpread : margin - game.homeSpread;
  if (adjusted === 0) return null;
  return adjusted > 0;
}

function venueSplit(rows: { teamWon: boolean }[]): InsightVenueSplit {
  const wins = rows.filter((row) => row.teamWon).length;
  const losses = rows.length - wins;
  return {
    wins,
    losses,
    games: rows.length,
    winRate: rows.length > 0 ? wins / rows.length : null,
  };
}

function crewPartnersForGames(
  games: RuntimeGameLogEntry[],
  refSlugValue: string,
): InsightCrewPartner[] {
  const counts = new Map<string, number>();
  for (const game of games) {
    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      if (slug === refSlugValue) continue;
      counts.set(official.name, (counts.get(official.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, gamesWith]) => ({ name, games: gamesWith }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);
}

function opponentLabel(
  game: RuntimeGameLogEntry,
  teamAbbr: string,
): string {
  return game.homeTeam === teamAbbr ? game.awayTeam : game.homeTeam;
}

function buildMatchupGames(
  leagueId: LeagueId,
  games: RuntimeGameLogEntry[],
  refSlugValue: string,
  teamAbbr: string,
): InsightDrilldownGame[] {
  const whistleLabel = whistleLabelForLeague(leagueId);
  return games
    .filter((game) => {
      const involvesTeam =
        game.homeTeam === teamAbbr || game.awayTeam === teamAbbr;
      const involvesRef = game.officials.some(
        (official) => refSlug(official.name, official.number) === refSlugValue,
      );
      return involvesTeam && involvesRef;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.gameId.localeCompare(a.gameId))
    .slice(0, 10)
    .map((game) => {
      const isHome = game.homeTeam === teamAbbr;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const opponentScore = isHome ? game.awayScore : game.homeScore;
      const teamWon = teamScore > opponentScore;
      return {
        gameId: game.gameId,
        date: game.date,
        season: game.season,
        isHome,
        opponentLabel: opponentLabel(game, teamAbbr),
        teamScore,
        opponentScore,
        scoreLine: `${teamScore}-${opponentScore}`,
        whistleCount: whistleCountForGame(leagueId, game, isHome),
        whistleLabel,
        spreadCovered: spreadCoveredForTeam(game, isHome),
        teamWon,
      };
    });
}

function parseRecord(record: string | undefined): { wins: number; losses: number } {
  if (!record) return { wins: 0, losses: 0 };
  const [winsRaw, lossesRaw] = record.split("-");
  return {
    wins: Number.parseInt(winsRaw ?? "0", 10) || 0,
    losses: Number.parseInt(lossesRaw ?? "0", 10) || 0,
  };
}

function parseBaselinePct(stats: LeagueInsightCard["stats"]): number {
  const baseline = stats.find((stat) => stat.label === "Team baseline")?.value ?? "0";
  const numeric = Number.parseFloat(baseline.replace("%", ""));
  return Number.isFinite(numeric) ? numeric / 100 : 0;
}

export function buildInsightDrilldownPayload(
  root: string,
  card: LeagueInsightCard,
): InsightDrilldownPayload | null {
  if (card.kind !== "matrix-edge" || !card.refSlug || !card.teamAbbr) {
    return null;
  }

  const leagueId = card.leagueId;
  if (!(leagueId in DATA_LEAGUE)) return null;

  const games = loadLeagueGameLogs(root, leagueId);
  if (games.length === 0) return null;

  const allMatchupGames = games.filter((game) => {
    const involvesTeam =
      game.homeTeam === card.teamAbbr || game.awayTeam === card.teamAbbr;
    const involvesRef = game.officials.some(
      (official) => refSlug(official.name, official.number) === card.refSlug,
    );
    return involvesTeam && involvesRef;
  });

  const tableGames = buildMatchupGames(
    leagueId,
    games,
    card.refSlug,
    card.teamAbbr,
  );
  const homeRows = allMatchupGames
    .filter((game) => game.homeTeam === card.teamAbbr)
    .map((game) => ({ teamWon: game.homeScore > game.awayScore }));
  const awayRows = allMatchupGames
    .filter((game) => game.awayTeam === card.teamAbbr)
    .map((game) => ({ teamWon: game.awayScore > game.homeScore }));

  const record = parseRecord(
    card.stats.find((stat) => stat.label === "Ref×team record")?.value,
  );
  const wins = record.wins;
  const losses = record.losses;
  const winRate = wins + losses > 0 ? wins / (wins + losses) : 0;
  const baselineWinRate = parseBaselinePct(card.stats);
  const deltaPts = Number.parseFloat(card.heroValue.replace(/pp|\+/g, "")) || 0;

  const drilldownId = insightDrilldownId(leagueId, card.refSlug, card.teamAbbr);

  return {
    drilldownId,
    leagueId,
    refSlug: card.refSlug,
    refName: card.entityName ?? card.refSlug,
    teamAbbr: card.teamAbbr,
    teamLabel: card.teamLabel ?? card.teamAbbr,
    heroValue: card.heroValue,
    heroLabel: card.heroLabel,
    heroTone: card.heroTone,
    wins,
    losses,
    winRate,
    baselineWinRate,
    deltaPts,
    games: tableGames,
    homeSplit: venueSplit(homeRows),
    awaySplit: venueSplit(awayRows),
    crewPartners: crewPartnersForGames(allMatchupGames, card.refSlug),
  };
}
