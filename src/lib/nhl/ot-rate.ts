import { getRefBySlug, refSlug } from "@/lib/nhl/data";
import { findOddsTotal } from "@/lib/nhl/odds";
import { otRateProvenance } from "@/lib/provenance";
import type {
  AssignmentGame,
  NhlOtRateSignal,
  OddsFile,
  RefOfficial,
  RefStatsFile,
} from "@/lib/types";

const OT_RATE_BUFFER = 0.04;
const TIGHT_SPREAD_MAX = 1.5;
const MIN_REF_GAMES = 25;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function refereesOnly(crew: RefOfficial[]): RefOfficial[] {
  return crew.filter((o) => o.role === "referee");
}

export function computeOtRateSignal(
  game: AssignmentGame,
  stats: RefStatsFile,
  odds: OddsFile,
): NhlOtRateSignal | null {
  const refs = refereesOnly(game.crew);
  if (refs.length === 0) return null;

  const leagueOtRate = stats.meta.leagueOvertimeRate ?? 0.23;
  const otRates: number[] = [];
  let sampleGames = 0;

  for (const official of refs) {
    const slug = refSlug(official.name, official.number);
    const profile = getRefBySlug(slug);
    const analytics = profile?.nhlAnalytics;
    if (!analytics || profile.games < MIN_REF_GAMES) continue;
    otRates.push(analytics.overtimeRate);
    sampleGames = Math.max(sampleGames, profile.games);
  }

  if (otRates.length === 0) return null;

  const refereeOtRate = otRates.reduce((a, b) => a + b, 0) / otRates.length;
  if (refereeOtRate < leagueOtRate + OT_RATE_BUFFER) return null;

  const line = findOddsTotal(game.awayTeam, game.homeTeam, odds);
  const homeSpread = line?.homeSpread ?? null;
  if (homeSpread === null || Math.abs(homeSpread) > TIGHT_SPREAD_MAX) {
    return null;
  }

  const signal: NhlOtRateSignal = {
    gameId: game.id,
    matchup: game.matchup,
    refereeOtRate: round3(refereeOtRate),
    leagueOtRate: round3(leagueOtRate),
    homeSpread,
    sampleGames,
    headline: "High OT rate crew — tight line",
    summary:
      `Referee pair OT rate ${(refereeOtRate * 100).toFixed(1)}% vs league ${(leagueOtRate * 100).toFixed(1)}%. ` +
      `Puck line ${homeSpread > 0 ? "+" : ""}${homeSpread} — consider OT/SO props when priced.`,
  };
  signal.provenance = otRateProvenance(signal, stats);
  return signal;
}

export function computeSlateOtSignals(
  games: AssignmentGame[],
  stats: RefStatsFile,
  odds: OddsFile,
): NhlOtRateSignal[] {
  return games
    .map((g) => computeOtRateSignal(g, stats, odds))
    .filter((s): s is NhlOtRateSignal => s !== null)
    .sort((a, b) => b.refereeOtRate - a.refereeOtRate);
}
