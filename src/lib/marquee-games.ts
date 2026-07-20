import { opponentTiersForSeason } from "@/lib/nba-strength-of-schedule";
import { getTeam as getNflTeam } from "@/lib/nfl/teams";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";

export type MarqueeTag =
  | "prime-time"
  | "rivalry"
  | "top-table"
  | "marquee-venue"
  | "high-stakes";

export interface MarqueeGameContext {
  isMarquee: boolean;
  tags: MarqueeTag[];
  reasons: string[];
}

const PRO_LEAGUES = new Set<LeagueId>(PRO_MATRIX_ANALYTICS_LEAGUE_IDS);

const HIGH_CAPACITY_VENUES: Record<LeagueId, readonly string[]> = {
  nba: ["LAL", "LAC", "GSW", "NYK", "BKN", "CHI", "BOS", "PHI", "DAL", "MIA"],
  nfl: ["DAL", "GB", "KC", "NE", "PIT", "SEA", "DEN", "PHI", "BUF", "SF"],
  nhl: ["MTL", "TOR", "BOS", "CHI", "DET", "NYR", "VGK", "LAK", "EDM", "COL"],
  epl: ["MUN", "MCI", "ARS", "LIV", "CHE", "TOT", "NEW", "WHU"],
  laliga: ["BAR", "RMA", "ATM", "SEV", "VAL", "ATH", "RSO"],
  wnba: [],
  mlb: [],
  cbb: [],
  cfb: [],
};

const EPL_DERBIES: [string, string][] = [
  ["MUN", "MCI"],
  ["ARS", "TOT"],
  ["LIV", "EVE"],
  ["CHE", "TOT"],
  ["NEW", "SUN"],
];

const LALIGA_DERBIES: [string, string][] = [
  ["BAR", "RMA"],
  ["SEV", "BET"],
  ["ATH", "RSO"],
  ["ATM", "RMA"],
  ["BAR", "ESP"],
];

const EPL_TOP_TABLE = new Set(["MCI", "ARS", "LIV", "AVL", "CHE", "TOT", "MUN", "NEW"]);
const LALIGA_TOP_TABLE = new Set(["RMA", "BAR", "ATM", "ATH", "RSO", "SEV", "BET", "VIL"]);

const NBA_RIVALRIES: [string, string][] = [
  ["LAL", "BOS"],
  ["LAL", "GSW"],
  ["NYK", "BKN"],
  ["CHI", "DET"],
  ["BOS", "PHI"],
];

const NHL_RIVALRIES: [string, string][] = [
  ["BOS", "MTL"],
  ["NYR", "NYI"],
  ["CHI", "DET"],
  ["COL", "VGK"],
  ["EDM", "CGY"],
];

function parseUtcDayOfWeek(date: string): number | null {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCDay();
}

function isDerby(
  homeTeam: string,
  awayTeam: string,
  pairs: [string, string][],
): boolean {
  const home = homeTeam.toUpperCase();
  const away = awayTeam.toUpperCase();
  return pairs.some(
    ([a, b]) =>
      (home === a && away === b) || (home === b && away === a),
  );
}

function isTopTableClash(
  homeTeam: string,
  awayTeam: string,
  table: Set<string>,
): boolean {
  return table.has(homeTeam.toUpperCase()) && table.has(awayTeam.toUpperCase());
}

function isHighCapacityHost(homeTeam: string, leagueId: LeagueId): boolean {
  const venues = HIGH_CAPACITY_VENUES[leagueId] ?? [];
  return venues.includes(homeTeam.toUpperCase());
}

function isTightLine(game: RuntimeGameLogEntry, maxSpread: number): boolean {
  return Math.abs(game.homeSpread) <= maxSpread;
}

function classifyNbaMarquee(game: RuntimeGameLogEntry): MarqueeGameContext {
  const tags: MarqueeTag[] = [];
  const reasons: string[] = [];
  const dow = parseUtcDayOfWeek(game.date);

  if (dow === 5 || dow === 6 || dow === 0) {
    tags.push("prime-time");
    reasons.push("weekend national-TV window");
  }
  if (game.date.slice(5) === "12-25") {
    tags.push("prime-time");
    reasons.push("Christmas Day slate");
  }
  if (isDerby(game.homeTeam, game.awayTeam, NBA_RIVALRIES)) {
    tags.push("rivalry");
    reasons.push("historic NBA rivalry");
  }
  const tiers = opponentTiersForSeason(game.season);
  const homeTier = tiers[game.homeTeam];
  const awayTier = tiers[game.awayTeam];
  if (homeTier === "top10" && awayTier === "top10") {
    tags.push("top-table");
    reasons.push("both teams top-10 by season record");
  }
  if (isHighCapacityHost(game.homeTeam, "nba")) {
    tags.push("marquee-venue");
    reasons.push("high-noise / max-capacity host market");
  }
  if (isTightLine(game, 4)) {
    tags.push("high-stakes");
    reasons.push("tight closing spread (<=4 pts)");
  }

  return { isMarquee: tags.length > 0, tags, reasons };
}

function classifyNflMarquee(game: RuntimeGameLogEntry): MarqueeGameContext {
  const tags: MarqueeTag[] = [];
  const reasons: string[] = [];
  const dow = parseUtcDayOfWeek(game.date);

  if (dow === 4) {
    tags.push("prime-time");
    reasons.push("Thursday Night Football window");
  }
  if (dow === 1) {
    tags.push("prime-time");
    reasons.push("Monday Night Football window");
  }
  if (dow === 0 && isTightLine(game, 4)) {
    tags.push("prime-time");
    reasons.push("Sunday night-caliber tight spread");
  }

  const home = getNflTeam(game.homeTeam);
  const away = getNflTeam(game.awayTeam);
  if (
    home &&
    away &&
    home.conference === away.conference &&
    home.division === away.division
  ) {
    tags.push("rivalry");
    reasons.push(`${home.division} division clash`);
  }
  if (isHighCapacityHost(game.homeTeam, "nfl")) {
    tags.push("marquee-venue");
    reasons.push("high-capacity NFL stadium host");
  }
  if (isTightLine(game, 3)) {
    tags.push("high-stakes");
    reasons.push("tight closing spread (<=3 pts)");
  }

  return { isMarquee: tags.length > 0, tags, reasons };
}

function classifyNhlMarquee(game: RuntimeGameLogEntry): MarqueeGameContext {
  const tags: MarqueeTag[] = [];
  const reasons: string[] = [];
  const dow = parseUtcDayOfWeek(game.date);

  if (dow === 6) {
    tags.push("prime-time");
    reasons.push("Saturday prime hockey window");
  }
  if (isDerby(game.homeTeam, game.awayTeam, NHL_RIVALRIES)) {
    tags.push("rivalry");
    reasons.push("Original Six / regional rivalry");
  }
  const originalSix = new Set(["BOS", "CHI", "DET", "MTL", "NYR", "TOR"]);
  if (
    originalSix.has(game.homeTeam.toUpperCase()) &&
    originalSix.has(game.awayTeam.toUpperCase())
  ) {
    tags.push("top-table");
    reasons.push("Original Six marquee matchup");
  }
  if (isHighCapacityHost(game.homeTeam, "nhl")) {
    tags.push("marquee-venue");
    reasons.push("high-noise NHL barn host");
  }
  if (isTightLine(game, 1.5)) {
    tags.push("high-stakes");
    reasons.push("tight puck line (<=1.5)");
  }

  return { isMarquee: tags.length > 0, tags, reasons };
}

function classifyEplMarquee(game: RuntimeGameLogEntry): MarqueeGameContext {
  const tags: MarqueeTag[] = [];
  const reasons: string[] = [];

  if (isDerby(game.homeTeam, game.awayTeam, EPL_DERBIES)) {
    tags.push("rivalry");
    reasons.push("Premier League derby");
  }
  if (isTopTableClash(game.homeTeam, game.awayTeam, EPL_TOP_TABLE)) {
    tags.push("top-table");
    reasons.push("top-table Premier League clash");
  }
  if (isHighCapacityHost(game.homeTeam, "epl")) {
    tags.push("marquee-venue");
    reasons.push("high-capacity Premier League ground");
  }
  const dow = parseUtcDayOfWeek(game.date);
  if (dow === 0 || dow === 6) {
    tags.push("prime-time");
    reasons.push("weekend broadcast window");
  }
  if (isTightLine(game, 0.5)) {
    tags.push("high-stakes");
    reasons.push("tight Asian handicap line");
  }

  return { isMarquee: tags.length > 0, tags, reasons };
}

function classifyLaligaMarquee(game: RuntimeGameLogEntry): MarqueeGameContext {
  const tags: MarqueeTag[] = [];
  const reasons: string[] = [];

  if (isDerby(game.homeTeam, game.awayTeam, LALIGA_DERBIES)) {
    tags.push("rivalry");
    if (
      (game.homeTeam === "BAR" && game.awayTeam === "RMA") ||
      (game.homeTeam === "RMA" && game.awayTeam === "BAR")
    ) {
      reasons.push("El Clasico");
    } else {
      reasons.push("La Liga derby");
    }
  }
  if (isTopTableClash(game.homeTeam, game.awayTeam, LALIGA_TOP_TABLE)) {
    tags.push("top-table");
    reasons.push("top-table La Liga clash");
  }
  if (isHighCapacityHost(game.homeTeam, "laliga")) {
    tags.push("marquee-venue");
    reasons.push("high-capacity La Liga ground");
  }
  const dow = parseUtcDayOfWeek(game.date);
  if (dow === 0 || dow === 6) {
    tags.push("prime-time");
    reasons.push("weekend broadcast window");
  }
  if (isTightLine(game, 0.5)) {
    tags.push("high-stakes");
    reasons.push("tight Asian handicap line");
  }

  return { isMarquee: tags.length > 0, tags, reasons };
}

/** Objective marquee classification for professional-league game logs. */
export function classifyMarqueeGame(
  game: RuntimeGameLogEntry,
  leagueId: LeagueId,
): MarqueeGameContext {
  if (!PRO_LEAGUES.has(leagueId)) {
    return { isMarquee: false, tags: [], reasons: [] };
  }

  switch (leagueId) {
    case "nba":
      return classifyNbaMarquee(game);
    case "nfl":
      return classifyNflMarquee(game);
    case "nhl":
      return classifyNhlMarquee(game);
    case "epl":
      return classifyEplMarquee(game);
    case "laliga":
      return classifyLaligaMarquee(game);
    default:
      return { isMarquee: false, tags: [], reasons: [] };
  }
}

export function isMarqueeGame(
  game: RuntimeGameLogEntry,
  leagueId: LeagueId,
): boolean {
  return classifyMarqueeGame(game, leagueId).isMarquee;
}

/** Teams with known large-market / high-noise venues for documentation exports. */
export function marqueeVenueTeams(leagueId: LeagueId): readonly string[] {
  return HIGH_CAPACITY_VENUES[leagueId] ?? [];
}
