/**
 * Post-processing dedupe: collapse referee profiles that resolve to the same
 * canonical identity (jersey-number changes or curated name aliases) into one
 * merged profile. Builders that fetch from live feeds (ESPN, etc.) cannot
 * always re-key at ingest time, so this runs as a final, source-agnostic step
 * and also fixes already-committed data files.
 *
 * Aggregates that can be recombined exactly (counts, games-weighted means) are;
 * per-team splits sum wins/losses/games and re-weight rates. League-specific
 * analytics/betting sub-objects are carried from the dominant (most-games)
 * profile — a safe approximation because alias variants are almost always tiny
 * fragments of the primary profile.
 */
import { dedupeByGameId } from "../../src/lib/game-count";
import type { RefProfile, RefTeamStat } from "../../src/lib/types";
import { dedupeByGameId } from "../../src/lib/game-count";
import {
  canonicalRefKey,
  chooseRefIdentity,
  displayNameForKey,
} from "./ref-identity";
import { refSlug } from "./slug";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Games-weighted mean of a numeric field across profiles. */
function weightedMean(
  profiles: RefProfile[],
  pick: (p: RefProfile) => number | null | undefined,
): number {
  let num = 0;
  let den = 0;
  for (const p of profiles) {
    const v = pick(p);
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    num += v * p.games;
    den += p.games;
  }
  return den > 0 ? num / den : 0;
}

function mergeTeamStats(profiles: RefProfile[]): Record<string, RefTeamStat> | undefined {
  const byTeam = new Map<string, RefProfile[]>();
  for (const p of profiles) {
    if (!p.teamStats) continue;
    for (const team of Object.keys(p.teamStats)) {
      const list = byTeam.get(team) ?? [];
      list.push(p);
      byTeam.set(team, list);
    }
  }
  if (byTeam.size === 0) return undefined;

  const merged: Record<string, RefTeamStat> = {};
  for (const [team, ps] of byTeam) {
    const stats = ps.map((p) => p.teamStats![team]);
    const games = stats.reduce((s, t) => s + t.games, 0);
    const hasWL = stats.every((t) => t.wins !== undefined && t.losses !== undefined);
    const wins = hasWL ? stats.reduce((s, t) => s + (t.wins ?? 0), 0) : undefined;
    const losses = hasWL ? stats.reduce((s, t) => s + (t.losses ?? 0), 0) : undefined;
    const wmean = (pick: (t: RefTeamStat) => number | undefined) => {
      let num = 0;
      let den = 0;
      for (const t of stats) {
        const v = pick(t);
        if (v === undefined || Number.isNaN(v)) continue;
        num += v * t.games;
        den += t.games;
      }
      return den > 0 ? num / den : 0;
    };
    const techDiffs = stats.filter((t) => t.avgTechnicalFoulDifferential !== undefined);
    merged[team] = {
      games,
      avgFoulDifferential: round1(wmean((t) => t.avgFoulDifferential)),
      avgTotalPoints: round1(wmean((t) => t.avgTotalPoints)),
      overRate: round3(wmean((t) => t.overRate)),
      winRate:
        wins !== undefined && games > 0
          ? round3(wins / games)
          : round3(wmean((t) => t.winRate)),
      ...(wins !== undefined ? { wins, losses } : {}),
      ...(techDiffs.length > 0
        ? {
            avgTechnicalFoulDifferential: round1(
              wmean((t) => t.avgTechnicalFoulDifferential),
            ),
          }
        : {}),
    };
  }
  return merged;
}

function lastDateOf(p: RefProfile): string {
  return p.recentGames?.[0]?.date ?? "";
}

/** Merge profile game totals without double-counting shared games. */
function mergeRefGameCounts(profiles: RefProfile[]): number {
  const numbers = new Set(profiles.map((p) => p.number));
  if (numbers.size === 1) {
    return Math.max(...profiles.map((p) => p.games));
  }
  return profiles.reduce((sum, p) => sum + p.games, 0);
}

export interface MergeDuplicateOptions {
  leagueAvgTotal: number;
  leagueAvgFouls: number;
}

export interface MergeDuplicateResult {
  refs: RefProfile[];
  mergedGroups: { canonical: string; from: string[]; games: number }[];
}

/** Merge same-canonical-identity profiles; returns deduped list + a report. */
export function mergeDuplicateRefProfiles(
  refs: RefProfile[],
  opts: MergeDuplicateOptions,
): MergeDuplicateResult {
  const groups = new Map<string, RefProfile[]>();
  const order: string[] = [];
  for (const ref of refs) {
    const key = canonicalRefKey(ref.name);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(ref);
  }

  const mergedRefs: RefProfile[] = [];
  const mergedGroups: MergeDuplicateResult["mergedGroups"] = [];

  for (const key of order) {
    const group = groups.get(key)!;
    if (group.length === 1) {
      mergedRefs.push(group[0]);
      continue;
    }

    const { lastDate: _lastDate, ...dominant } = chooseRefIdentity(
      group.map((p) => ({ ...p, lastDate: lastDateOf(p) })),
    );
    void _lastDate;
    const name = displayNameForKey(key, dominant.name);
    const totalGames = mergeRefGameCounts(group);
    const avgTotal = weightedMean(group, (p) => p.avgTotalPoints);
    const avgFouls = weightedMean(group, (p) => p.avgFouls);
    const overRate = weightedMean(group, (p) => p.overRate);
    const coverProfiles = group.filter((p) => p.homeCoverRate !== null);
    const seasons = [...new Set(group.flatMap((p) => p.seasons))].sort();
    const recentGames = dedupeByGameId(group.flatMap((p) => p.recentGames ?? []))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    mergedRefs.push({
      ...dominant,
      slug: refSlug(name, dominant.number),
      name,
      number: dominant.number,
      games: totalGames,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate:
        coverProfiles.length > 0
          ? round3(weightedMean(coverProfiles, (p) => p.homeCoverRate))
          : null,
      totalPointsDelta: round1(avgTotal - opts.leagueAvgTotal),
      foulsDelta: round1(avgFouls - opts.leagueAvgFouls),
      seasons,
      recentGames,
      teamStats: mergeTeamStats(group),
    });

    mergedGroups.push({
      canonical: name,
      from: group.map((p) => `${p.name} (#${p.number}, ${p.games}g)`),
      games: totalGames,
    });
  }

  mergedRefs.sort((a, b) => b.games - a.games);
  return { refs: mergedRefs, mergedGroups };
}

/**
 * Convenience wrapper for builders: dedupe `refs` in place (preserving the
 * array reference used downstream) and log any merges performed.
 */
export function dedupeRefsInPlace(
  refs: RefProfile[],
  leagueAvgTotal: number,
  leagueAvgFouls: number,
): void {
  const { refs: merged, mergedGroups } = mergeDuplicateRefProfiles(refs, {
    leagueAvgTotal,
    leagueAvgFouls,
  });
  if (mergedGroups.length === 0) return;
  refs.length = 0;
  refs.push(...merged);
  for (const g of mergedGroups) {
    console.log(`  merged duplicate ref: ${g.canonical} ← ${g.from.join(", ")}`);
  }
}
