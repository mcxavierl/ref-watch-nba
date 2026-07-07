import { refSlug } from "@/lib/data";
import {
  gameLogsAvailable,
  loadRuntimeGameLogs,
  type RuntimeGameLogEntry,
} from "@/lib/game-logs";
import { sampleGateStatus } from "@/lib/provenance";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type {
  MetricProvenance,
  RefStatsFile,
  SampleGateStatus,
} from "@/lib/types";

export type CloseGameWindowId = "close-margin" | "close-spread" | "overtime";

export interface CloseGameWindow {
  id: CloseGameWindowId;
  label: string;
  description: string;
  isProxy: boolean;
}

export interface CloseGameCompareRow {
  label: string;
  windowValue: string;
  fullGameValue: string;
  delta: string;
}

export interface CloseGameMetrics {
  window: CloseGameWindow;
  gameCount: number;
  fullGameCount: number;
  avgTotal: number;
  fullAvgTotal: number;
  avgFouls: number;
  fullAvgFouls: number;
  overRate: number;
  fullOverRate: number;
  overBaseline: number;
  seasons: string[];
  coverageNote: string;
  honestyBanner: string | null;
  provenance: MetricProvenance;
  sampleGate: SampleGateStatus;
  compareRows: CloseGameCompareRow[];
}

interface GameAccumulator {
  games: number;
  totalPoints: number;
  totalFouls: number;
  overs: number;
}

const MIN_CLOSE_GAMES = 12;
const MIN_CLOSE_GAMES_TEAM = 8;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function emptyAcc(): GameAccumulator {
  return { games: 0, totalPoints: 0, totalFouls: 0, overs: 0 };
}

function addGame(acc: GameAccumulator, game: RuntimeGameLogEntry, overBaseline: number): void {
  acc.games += 1;
  acc.totalPoints += game.totalPoints;
  acc.totalFouls += game.totalFouls;
  if (game.totalPoints > overBaseline) acc.overs += 1;
}

function finalizeAcc(acc: GameAccumulator): {
  games: number;
  avgTotal: number;
  avgFouls: number;
  overRate: number;
} {
  if (acc.games === 0) {
    return { games: 0, avgTotal: 0, avgFouls: 0, overRate: 0 };
  }
  return {
    games: acc.games,
    avgTotal: round1(acc.totalPoints / acc.games),
    avgFouls: round1(acc.totalFouls / acc.games),
    overRate: round3(acc.overs / acc.games),
  };
}

function isNbaCloseMargin(game: RuntimeGameLogEntry): boolean {
  return Math.abs(game.homeScore - game.awayScore) <= 5;
}

function isNbaCloseSpread(game: RuntimeGameLogEntry): boolean {
  return Math.abs(game.homeSpread) <= 5.5;
}

function isNhlOvertime(game: RuntimeGameLogEntry): boolean {
  return game.wentToOvertime === true;
}

function isNhlCloseMargin(game: RuntimeGameLogEntry): boolean {
  if (game.wentToOvertime) return true;
  return Math.abs(game.homeScore - game.awayScore) <= 1;
}

function gameMatchesRef(game: RuntimeGameLogEntry, slug: string): boolean {
  return game.officials.some((o) => refSlug(o.name, o.number) === slug);
}

function gameMatchesTeam(game: RuntimeGameLogEntry, teamAbbr: string): boolean {
  const abbr = teamAbbr.toUpperCase();
  return game.homeTeam === abbr || game.awayTeam === abbr;
}

function nbaWindows(): CloseGameWindow[] {
  return [
    {
      id: "close-margin",
      label: "Close games (≤5 pt margin)",
      description:
        "Final margin within five points — a proxy for competitive late-game minutes. Not true last-two-minute (L2M) play-by-play data.",
      isProxy: true,
    },
    {
      id: "close-spread",
      label: "Pregame toss-ups (spread ≤5.5)",
      description:
        "Games where the closing spread was within 5.5 points — often stay tight through the fourth quarter. Spread lines may be synthetic in seeded data.",
      isProxy: true,
    },
  ];
}

function nhlWindows(): CloseGameWindow[] {
  return [
    {
      id: "overtime",
      label: "Overtime / shootout games",
      description:
        "Games that required extra time — the clearest late-game pressure proxy in our logs. Includes OT and SO scoring.",
      isProxy: true,
    },
    {
      id: "close-margin",
      label: "One-goal or OT games",
      description:
        "Regulation one-goal games plus any overtime — competitive games where third-period whistles matter most.",
      isProxy: true,
    },
  ];
}

function matchesWindow(
  game: RuntimeGameLogEntry,
  league: "NBA" | "NHL",
  windowId: CloseGameWindowId,
): boolean {
  if (league === "NBA") {
    if (windowId === "close-margin") return isNbaCloseMargin(game);
    if (windowId === "close-spread") return isNbaCloseSpread(game);
    return false;
  }
  if (windowId === "overtime") return isNhlOvertime(game);
  if (windowId === "close-margin") return isNhlCloseMargin(game);
  return false;
}

function buildCompareRows(
  windowStats: ReturnType<typeof finalizeAcc>,
  fullStats: ReturnType<typeof finalizeAcc>,
  league: "NBA" | "NHL",
): CloseGameCompareRow[] {
  const scoreUnit = league === "NBA" ? "pts" : "goals";
  const whistleUnit = league === "NBA" ? "fouls" : "PIM";

  return [
    {
      label: `Avg combined ${scoreUnit}`,
      windowValue: String(windowStats.avgTotal),
      fullGameValue: String(fullStats.avgTotal),
      delta: formatSigned(round1(windowStats.avgTotal - fullStats.avgTotal)),
    },
    {
      label: `Avg ${whistleUnit}`,
      windowValue: String(windowStats.avgFouls),
      fullGameValue: String(fullStats.avgFouls),
      delta: formatSigned(round1(windowStats.avgFouls - fullStats.avgFouls)),
    },
    {
      label: "Over rate",
      windowValue: formatPct(windowStats.overRate),
      fullGameValue: formatPct(fullStats.overRate),
      delta: formatSigned(round3((windowStats.overRate - fullStats.overRate) * 100)) + " pts",
    },
  ];
}

function honestyBannerFor(
  meta: RefStatsFile["meta"],
  logsSource: string | undefined,
  window: CloseGameWindow,
  gameCount: number,
): string | null {
  const parts: string[] = [];
  if (meta.source === "seeded" || logsSource?.includes("seed")) {
    parts.push("Derived from seeded/simulated game logs");
  }
  if (window.isProxy) {
    parts.push("proxy window — not official L2M play-by-play");
  }
  if (gameCount < MIN_CLOSE_GAMES) {
    parts.push(`partial coverage (${gameCount} games in window)`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function aggregateCloseGame(
  games: RuntimeGameLogEntry[],
  league: "NBA" | "NHL",
  meta: RefStatsFile["meta"],
  window: CloseGameWindow,
  logsSource: string | undefined,
  filter: (game: RuntimeGameLogEntry) => boolean,
  minGames: number,
): CloseGameMetrics | null {
  const full = emptyAcc();
  const windowAcc = emptyAcc();

  for (const game of games) {
    if (!filter(game)) continue;
    addGame(full, game, meta.leagueOverBaseline);
    if (matchesWindow(game, league, window.id)) {
      addGame(windowAcc, game, meta.leagueOverBaseline);
    }
  }

  if (full.games === 0) return null;

  const fullStats = finalizeAcc(full);
  const windowStats = finalizeAcc(windowAcc);

  const provenanceTag =
    meta.source === "seeded" || logsSource?.includes("seed")
      ? "computed-with-partial-data"
      : "computed-from-real";

  return {
    window,
    gameCount: windowStats.games,
    fullGameCount: fullStats.games,
    avgTotal: windowStats.avgTotal,
    fullAvgTotal: fullStats.avgTotal,
    avgFouls: windowStats.avgFouls,
    fullAvgFouls: fullStats.avgFouls,
    overRate: windowStats.overRate,
    fullOverRate: fullStats.overRate,
    overBaseline: meta.leagueOverBaseline,
    seasons: meta.seasons,
    coverageNote: `${windowStats.games} of ${fullStats.games} games match this window`,
    honestyBanner: honestyBannerFor(meta, logsSource, window, windowStats.games),
    provenance: {
      tag: provenanceTag,
      sampleSize: windowStats.games,
      gateThreshold: minGames,
      note: window.description,
    },
    sampleGate: sampleGateStatus(windowStats.games, minGames),
    compareRows: buildCompareRows(windowStats, fullStats, league),
  };
}

export function computeRefCloseGameMetrics(
  refSlugValue: string,
  meta: RefStatsFile["meta"],
  league: "NBA" | "NHL",
): CloseGameMetrics[] {
  const logs = loadRuntimeGameLogs(league);
  if (!logs?.games.length) return [];

  const windows = league === "NBA" ? nbaWindows() : nhlWindows();
  const results: CloseGameMetrics[] = [];

  for (const window of windows) {
    const metrics = aggregateCloseGame(
      logs.games,
      league,
      meta,
      window,
      logs.source,
      (game) => gameMatchesRef(game, refSlugValue),
      MIN_CLOSE_GAMES,
    );
    if (metrics) results.push(metrics);
  }

  return results;
}

export function computeTeamCloseGameMetrics(
  teamAbbr: string,
  meta: RefStatsFile["meta"],
  league: "NBA" | "NHL",
): CloseGameMetrics[] {
  const logs = loadRuntimeGameLogs(league);
  if (!logs?.games.length) return [];

  const windows = league === "NBA" ? nbaWindows() : nhlWindows();
  const results: CloseGameMetrics[] = [];

  for (const window of windows) {
    const metrics = aggregateCloseGame(
      logs.games,
      league,
      meta,
      window,
      logs.source,
      (game) => gameMatchesTeam(game, teamAbbr),
      MIN_CLOSE_GAMES_TEAM,
    );
    if (metrics) results.push(metrics);
  }

  return results;
}

export function closeGameDataAvailable(league: "NBA" | "NHL"): boolean {
  return gameLogsAvailable(league);
}
