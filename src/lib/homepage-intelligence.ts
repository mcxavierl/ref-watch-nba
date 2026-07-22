import { isLeagueAnalyticsUnlocked } from "@/config/leagues";
import { qualifiesRefAnomaly } from "@/lib/anomaly-surface";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { getLiveSlateGames } from "@/lib/live-slate-engine";
import type { LeagueId } from "@/lib/leagues";
import { loadLeagueStats } from "@/lib/load-league-stats";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { countNotableSignals } from "@/lib/profile-signals";
import {
  isWithinActiveSlateWindow,
  resolveGameTimestampMs,
} from "@/lib/query-windows";

function isActiveSlateGame(game: OverviewSlateEntry, nowMs: number): boolean {
  if (game.status !== "live" && game.status !== "scheduled") return false;
  if (game.status === "live" || game.gamePhase === "live") return true;
  const kickoffMs = resolveGameTimestampMs(game);
  return isWithinActiveSlateWindow(kickoffMs, nowMs);
}

function countAnomaliesForSlateGames(
  games: OverviewSlateEntry[],
  nowMs: number = Date.now(),
): number {
  const seen = new Set<string>();
  let total = 0;

  for (const game of games) {
    if (!isActiveSlateGame(game, nowMs)) continue;
    const crew = game.preview?.crew ?? [];
    if (crew.length === 0) continue;

    const leagueId = game.leagueId;
    const { stats } = loadLeagueStats(leagueId);
    if (!isLeagueAnalyticsUnlocked(leagueId, stats)) continue;

    for (const official of crew) {
      const key = `${leagueId}:${official.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const ref = stats.refs.find((profile) => profile.slug === official.slug);
      if (!ref) continue;

      const notable = countNotableSignals(ref, stats.meta, leagueId as LeagueId);
      if (qualifiesRefAnomaly(ref, leagueId as LeagueId, notable)) {
        total += 1;
      }
    }
  }

  return total;
}

/** Officials on today's active slate that pass the strict anomaly gate. */
export function countTodayAnomalyAlerts(
  data?: Pick<CrossLeagueOverview, "upcomingSlate">,
): number {
  const liveSlate = getLiveSlateGames({ allGames: true });
  const games = liveSlate.games.length > 0 ? liveSlate.games : (data?.upcomingSlate.games ?? []);
  return countAnomaliesForSlateGames(games);
}

/** @deprecated Use countTodayAnomalyAlerts for homepage briefing copy. */
export function countRefAnomalyAlerts(): number {
  return countTodayAnomalyAlerts();
}
