import { loadLeagueStats, loadScopedLeagueStats } from "@/lib/load-league-stats";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import type { SeasonScopeMode } from "@/lib/season-scope";
import {
  encodeCompareRef,
  type CompareRefBundle,
  type CompareRefPickerEntry,
} from "@/lib/ref-compare";

const COMPARE_LEAGUE_IDS: LeagueId[] = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
];

export function buildCompareRefPicker(): CompareRefPickerEntry[] {
  const entries: CompareRefPickerEntry[] = [];
  for (const leagueId of COMPARE_LEAGUE_IDS) {
    // Picker only needs slug/name/games — avoid scoped rebuilds across all leagues (Worker 1102).
    const { stats } = loadLeagueStats(leagueId);
    const config = LEAGUES[leagueId];
    for (const ref of stats.refs) {
      entries.push({
        key: encodeCompareRef(leagueId, ref.slug),
        slug: ref.slug,
        name: ref.name,
        games: ref.games,
        leagueId,
        leagueLabel: config.shortLabel,
        href: `${config.pathPrefix}/refs/${ref.slug}`,
      });
    }
  }
  return entries.sort((a, b) => b.games - a.games);
}

export function loadCompareRefBundle(
  leagueId: LeagueId,
  slug: string,
  scopeMode: SeasonScopeMode,
): CompareRefBundle | null {
  const { stats, scopeLabel } = loadScopedLeagueStats(leagueId, scopeMode);
  const profile = stats.refs.find((ref) => ref.slug === slug);
  if (!profile) return null;
  return {
    leagueId,
    slug,
    profile,
    meta: stats.meta,
    config: LEAGUES[leagueId],
    scopeLabel,
  };
}
