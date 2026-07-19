import { classifyMarqueeGame, type MarqueeGameContext, type MarqueeTag } from "@/lib/marquee-games";
import { classifyNcaaMarqueeGame } from "@/lib/ncaa-marquee-games";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { PRO_VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import type { AssignmentSeasonStage } from "@/lib/assignment-season-stage";
import type { AssignmentGame, GameOddsLine } from "@/lib/types";

export const LEVERAGE_INDEX_MARQUEE_THRESHOLD = 75;

export const LEVERAGE_WEIGHT_BROADCAST = 0.4;
export const LEVERAGE_WEIGHT_STAKES = 0.3;
export const LEVERAGE_WEIGHT_BETTING = 0.3;

export type BettingSplitFlow = {
  /** Share of handle from public/retail bettors (0-100). */
  publicPct: number;
  /** Share of handle from sharp/pro bettors (0-100). */
  sharpPct: number;
};

export type LeverageIndexFactors = {
  broadcast: number;
  stakes: number;
  betting: number;
};

export type LeverageIndexResult = {
  index: number;
  isMarquee: boolean;
  factors: LeverageIndexFactors;
  /** Pipe-delimited tooltip breakdown for marquee badge hover. */
  breakdownTooltip: string;
  bettingSplit: BettingSplitFlow;
  marquee: MarqueeGameContext;
};

export type LeverageIndexInput = {
  leagueId: LeagueId;
  game: Pick<AssignmentGame, "id" | "awayTeam" | "homeTeam" | "seasonStage">;
  slateDate: string;
  oddsLine?: GameOddsLine | null;
  seasonStage?: AssignmentSeasonStage;
};

const PRO_LEAGUES = new Set<LeagueId>(PRO_VERIFIED_LIVE_LEAGUE_IDS);

const LEAGUE_SPREAD_TIGHT: Partial<Record<LeagueId, number>> = {
  nba: 4,
  nfl: 3,
  nhl: 1.5,
  epl: 0.5,
  laliga: 0.5,
  cbb: 4,
  cfb: 3,
};

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function leagueCode(leagueId: LeagueId): RuntimeGameLogEntry["league"] {
  switch (leagueId) {
    case "nba":
      return "NBA";
    case "nfl":
      return "NFL";
    case "nhl":
      return "NHL";
    case "epl":
      return "EPL";
    case "laliga":
      return "LALIGA";
    case "cbb":
      return "CBB";
    case "cfb":
      return "CFB";
    default:
      return "NBA";
  }
}

/** Minimal game-log stub for marquee heuristics on upcoming assignments. */
export function stubRuntimeGameLogForLeverage(
  input: LeverageIndexInput,
): RuntimeGameLogEntry {
  const homeSpread = input.oddsLine?.homeSpread ?? 7;
  return {
    gameId: input.game.id,
    date: input.slateDate,
    season: input.slateDate.slice(0, 4),
    league: leagueCode(input.leagueId),
    homeTeam: input.game.homeTeam,
    awayTeam: input.game.awayTeam,
    homeScore: 0,
    awayScore: 0,
    totalPoints: 0,
    totalFouls: 0,
    closingTotal: input.oddsLine?.total ?? 220,
    homeSpread,
    lineSource: input.oddsLine ? "external" : "synthetic",
    officials: [],
  };
}

function classifyUpcomingMarquee(
  leagueId: LeagueId,
  stub: RuntimeGameLogEntry,
): MarqueeGameContext {
  if (leagueId === "cbb" || leagueId === "cfb") {
    return classifyNcaaMarqueeGame(stub, leagueId);
  }
  if (PRO_LEAGUES.has(leagueId)) {
    return classifyMarqueeGame(stub, leagueId);
  }
  return { isMarquee: false, tags: [], reasons: [] };
}

function tagScore(tags: MarqueeTag[], tag: MarqueeTag, points: number): number {
  return tags.includes(tag) ? points : 0;
}

function broadcastFactorScore(marquee: MarqueeGameContext, slateDate: string): number {
  let score = 25;
  score += tagScore(marquee.tags, "prime-time", 55);
  score += tagScore(marquee.tags, "marquee-venue", 18);

  const dow = new Date(`${slateDate}T12:00:00Z`).getUTCDay();
  if (dow === 0 || dow === 6) score += 8;
  if (dow === 4 || dow === 1) score += 12;

  return clampScore(score);
}

function stakesFactorScore(
  marquee: MarqueeGameContext,
  seasonStage?: AssignmentSeasonStage,
): number {
  if (seasonStage === "preseason" || seasonStage === "exhibition") {
    return clampScore(15);
  }

  let score = 20;
  score += tagScore(marquee.tags, "top-table", 35);
  score += tagScore(marquee.tags, "rivalry", 30);
  score += tagScore(marquee.tags, "high-stakes", 28);

  if (marquee.tags.includes("rivalry") && marquee.tags.includes("high-stakes")) {
    score += 12;
  }

  return clampScore(score);
}

function spreadTightnessScore(
  leagueId: LeagueId,
  homeSpread: number | undefined,
): number {
  const maxSpread = LEAGUE_SPREAD_TIGHT[leagueId] ?? 4;
  if (homeSpread === undefined || !Number.isFinite(homeSpread)) return 35;
  const gap = Math.abs(homeSpread);
  if (gap <= maxSpread) return 90;
  if (gap <= maxSpread + 2) return 70;
  if (gap <= maxSpread + 5) return 50;
  return 30;
}

function splitDivergence(publicPct: number, sharpPct: number): number {
  return Math.abs(publicPct - sharpPct);
}

/** Resolve public/sharp handle shares from odds metadata or a stable market proxy. */
export function resolveBettingSplitFlow(
  input: LeverageIndexInput,
  marquee: MarqueeGameContext,
): BettingSplitFlow {
  const line = input.oddsLine;
  if (
    line?.publicHandlePct !== undefined &&
    line?.sharpHandlePct !== undefined &&
    Number.isFinite(line.publicHandlePct) &&
    Number.isFinite(line.sharpHandlePct)
  ) {
    const publicPct = clampScore(line.publicHandlePct);
    const sharpPct = clampScore(line.sharpHandlePct);
    const total = publicPct + sharpPct;
    if (total > 0 && total !== 100) {
      return {
        publicPct: clampScore((publicPct / total) * 100),
        sharpPct: clampScore((sharpPct / total) * 100),
      };
    }
    return { publicPct, sharpPct };
  }

  const spread = Math.abs(input.oddsLine?.homeSpread ?? 7);
  const tightnessBoost = Math.max(0, 8 - spread) * 3;
  let publicPct = 52 + tightnessBoost;
  if (marquee.tags.includes("prime-time")) publicPct += 10;
  if (marquee.tags.includes("rivalry")) publicPct += 6;
  if (marquee.tags.includes("top-table")) publicPct += 4;

  publicPct = clampScore(Math.min(82, Math.max(48, publicPct)));
  const divergence = Math.min(28, Math.round(tightnessBoost + (marquee.tags.includes("rivalry") ? 8 : 0)));
  const sharpPct = clampScore(100 - publicPct + divergence * 0.35);

  const normalizedPublic = clampScore((publicPct / (publicPct + sharpPct)) * 100);
  return {
    publicPct: normalizedPublic,
    sharpPct: clampScore(100 - normalizedPublic),
  };
}

function bettingFactorScore(
  input: LeverageIndexInput,
  marquee: MarqueeGameContext,
  split: BettingSplitFlow,
): number {
  let score = input.oddsLine ? 42 : 28;
  score += spreadTightnessScore(input.leagueId, input.oddsLine?.homeSpread) * 0.35;

  const divergence = splitDivergence(split.publicPct, split.sharpPct);
  if (divergence >= 18) score += 28;
  else if (divergence >= 10) score += 16;
  else score += 6;

  if (marquee.tags.includes("high-stakes")) score += 8;
  if (input.oddsLine?.publicHandlePct !== undefined) score += 6;

  return clampScore(score);
}

function broadcastLabel(score: number): string {
  if (score >= 75) return "Prime-time";
  if (score >= 55) return "National window";
  return "Standard window";
}

function stakesLabel(score: number, marquee: MarqueeGameContext): string {
  if (score >= 80) {
    if (marquee.tags.includes("top-table")) return "Championship stakes";
    if (marquee.tags.includes("high-stakes")) return "High playoff stakes";
    return "High stakes";
  }
  if (score >= 55) return "Rivalry stakes";
  return "Regular season";
}

function bettingLabel(split: BettingSplitFlow): string {
  const divergence = splitDivergence(split.publicPct, split.sharpPct);
  if (divergence >= 18) return "Sharp money divergence";
  if (divergence >= 10) return "Active handle";
  return "Balanced handle";
}

function buildBreakdownTooltip(
  broadcast: number,
  stakes: number,
  betting: number,
  marquee: MarqueeGameContext,
  split: BettingSplitFlow,
): string {
  return [
    broadcastLabel(broadcast),
    stakesLabel(stakes, marquee),
    bettingLabel(split),
  ].join(" | ");
}

/** Weighted 0-100 leverage score for upcoming slate games. */
export function computeLeverageIndex(input: LeverageIndexInput): LeverageIndexResult {
  const stub = stubRuntimeGameLogForLeverage(input);
  const marquee = classifyUpcomingMarquee(input.leagueId, stub);
  const bettingSplit = resolveBettingSplitFlow(input, marquee);

  const factors: LeverageIndexFactors = {
    broadcast: broadcastFactorScore(marquee, input.slateDate),
    stakes: stakesFactorScore(marquee, input.seasonStage),
    betting: bettingFactorScore(input, marquee, bettingSplit),
  };

  const index = clampScore(
    factors.broadcast * LEVERAGE_WEIGHT_BROADCAST +
      factors.stakes * LEVERAGE_WEIGHT_STAKES +
      factors.betting * LEVERAGE_WEIGHT_BETTING,
  );

  return {
    index,
    isMarquee: index > LEVERAGE_INDEX_MARQUEE_THRESHOLD,
    factors,
    breakdownTooltip: buildBreakdownTooltip(
      factors.broadcast,
      factors.stakes,
      factors.betting,
      marquee,
      bettingSplit,
    ),
    bettingSplit,
    marquee,
  };
}

export function isMarqueeLeverageIndex(index: number | null | undefined): boolean {
  return (
    index !== null &&
    index !== undefined &&
    Number.isFinite(index) &&
    index > LEVERAGE_INDEX_MARQUEE_THRESHOLD
  );
}
