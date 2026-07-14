import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import type { MarqueeGameContext, MarqueeTag } from "@/lib/marquee-games";

const CBB_RIVALRIES: [string, string][] = [
  ["DUKE", "UNC"],
  ["UK", "LOU"],
  ["KU", "KSU"],
  ["MICH", "OSU"],
  ["UCLA", "USC"],
  ["GONZ", "BYU"],
  ["SYR", "GEOR"],
  ["IND", "PUR"],
  ["UCONN", "CREI"],
  ["ALA", "AUB"],
];

const CFB_RIVALRIES: [string, string][] = [
  ["ALA", "AUB"],
  ["OSU", "MICH"],
  ["TEX", "OU"],
  ["UGA", "FLA"],
  ["USC", "UCLA"],
  ["FSU", "MIA"],
  ["CLEM", "FSU"],
  ["ORE", "WASH"],
  ["TENN", "ALA"],
  ["ND", "USC"],
];

function isDerby(home: string, away: string, pairs: [string, string][]): boolean {
  const h = home.toUpperCase();
  const a = away.toUpperCase();
  return pairs.some(
    ([left, right]) =>
      (h === left && a === right) || (h === right && a === left),
  );
}

function parseMonth(date: string): number | null {
  const match = date.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return Number.parseInt(match[2], 10);
}

/** March–April window for conference tournaments + NCAA tournament (CBB). */
export function isCbbTournamentWindow(date: string): boolean {
  const month = parseMonth(date);
  return month === 3 || month === 4;
}

/** Late November rivalry week + bowl/championship season (CFB). */
export function isCfbHighStakesWindow(date: string): boolean {
  const month = parseMonth(date);
  return month === 11 || month === 12 || month === 1;
}

export function classifyNcaaMarqueeGame(
  game: RuntimeGameLogEntry,
  leagueId: Extract<LeagueId, "cbb" | "cfb">,
): MarqueeGameContext {
  const tags: MarqueeTag[] = [];
  const reasons: string[] = [];
  const home = game.homeTeam.toUpperCase();
  const away = game.awayTeam.toUpperCase();

  if (leagueId === "cbb") {
    if (isDerby(home, away, CBB_RIVALRIES)) {
      tags.push("rivalry");
      reasons.push("tracked college basketball rivalry");
    }
    if (isCbbTournamentWindow(game.date)) {
      tags.push("high-stakes");
      reasons.push("conference or NCAA tournament window");
    }
  } else {
    if (isDerby(home, away, CFB_RIVALRIES)) {
      tags.push("rivalry");
      reasons.push("tracked college football rivalry");
    }
    if (isCfbHighStakesWindow(game.date)) {
      tags.push("high-stakes");
      reasons.push("rivalry week or postseason window");
    }
  }

  if (tags.includes("rivalry") && tags.includes("high-stakes")) {
    tags.push("top-table");
    reasons.push("rivalry in a high-stakes window");
  }

  return {
    isMarquee: tags.length > 0,
    tags,
    reasons,
  };
}

export function isNcaaHighStakesGame(
  game: RuntimeGameLogEntry,
  leagueId: Extract<LeagueId, "cbb" | "cfb">,
): boolean {
  const context = classifyNcaaMarqueeGame(game, leagueId);
  return (
    context.tags.includes("rivalry") ||
    context.tags.includes("high-stakes") ||
    context.tags.includes("top-table")
  );
}
