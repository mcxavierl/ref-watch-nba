import { isRefStatsPayload } from "@/lib/json-asset-guards";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import {
  encodeCompareRef,
  parseCompareRef,
  type CompareRefBundle,
  type CompareRefPickerEntry,
} from "@/lib/ref-compare";
import {
  formatSeasonScope,
  resolveScopedSeasonsForLeague,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import type { RefStatsFile } from "@/lib/types";

const COMPARE_LEAGUE_IDS: LeagueId[] = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
];

const statsCache = new Map<LeagueId, RefStatsFile>();
let pickerCache: CompareRefPickerEntry[] | null = null;

function refStatsAssetPath(leagueId: LeagueId): string {
  return leagueId === "nba"
    ? "/data/nba/ref-stats.json"
    : `/data/${leagueId}/ref-stats.json`;
}

/** Static CDN JSON only — no Worker getRefStats() on selection changes. */
export async function fetchCompareLeagueStats(
  leagueId: LeagueId,
): Promise<RefStatsFile | null> {
  const cached = statsCache.get(leagueId);
  if (cached) return cached;

  try {
    const res = await fetch(refStatsAssetPath(leagueId));
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isRefStatsPayload(data) || data.refs.length === 0) return null;
    statsCache.set(leagueId, data);
    return data;
  } catch {
    return null;
  }
}

export async function loadCompareRefPickerEntries(): Promise<
  CompareRefPickerEntry[]
> {
  if (pickerCache) return pickerCache;

  const payloads = await Promise.all(
    COMPARE_LEAGUE_IDS.map((leagueId) => fetchCompareLeagueStats(leagueId)),
  );

  const entries: CompareRefPickerEntry[] = [];
  COMPARE_LEAGUE_IDS.forEach((leagueId, index) => {
    const stats = payloads[index];
    if (!stats) return;
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
  });

  pickerCache = entries.sort((a, b) => b.games - a.games);
  return pickerCache;
}

export function buildCompareRefBundleFromStats(
  leagueId: LeagueId,
  slug: string,
  stats: RefStatsFile,
  scopeMode: SeasonScopeMode,
): CompareRefBundle | null {
  const profile = stats.refs.find((ref) => ref.slug === slug);
  if (!profile) return null;
  const scopedSeasons = resolveScopedSeasonsForLeague(
    leagueId,
    scopeMode,
    stats.meta.seasons,
  );
  return {
    leagueId,
    slug,
    profile,
    meta: stats.meta,
    config: LEAGUES[leagueId],
    scopeLabel: formatSeasonScope(scopedSeasons.length),
  };
}

export async function resolveCompareRefBundle(
  rawKey: string | null | undefined,
  scopeMode: SeasonScopeMode,
): Promise<CompareRefBundle | null> {
  const parsed = parseCompareRef(rawKey);
  if (!parsed) return null;
  const stats = await fetchCompareLeagueStats(parsed.leagueId);
  if (!stats) return null;
  return buildCompareRefBundleFromStats(
    parsed.leagueId,
    parsed.slug,
    stats,
    scopeMode,
  );
}

/** Labels for the idle comparison metrics grid. */
export const COMPARE_GHOST_METRIC_ROWS = [
  "Games",
  "Scoring pace",
  "Over rate",
  "Whistle pace",
  "Spread cover",
  "O/U delta",
] as const;
