import * as fs from "node:fs";
import * as path from "node:path";
import {
  aggregateBbrRefTeamRecords,
  normalizeRefName,
  type BbrRefTeamRecordsFile,
} from "../../src/lib/bbr-ref-team-records";
import type { RefProfile, RefStatsFile, RefTeamStat } from "./types";

export interface RefNameMatchResult {
  slug: string;
  name: string;
  number: number;
}

export interface ApplyBbrResult {
  stats: RefStatsFile;
  matchedPairs: number;
  unmatchedReferees: string[];
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Build normalized-name → roster entry map (first wins on collision). */
export function buildRefNameIndex(
  refs: RefProfile[],
): Map<string, RefNameMatchResult> {
  const index = new Map<string, RefNameMatchResult>();
  for (const ref of refs) {
    const key = normalizeRefName(ref.name);
    if (!index.has(key)) {
      index.set(key, { slug: ref.slug, name: ref.name, number: ref.number });
    }
  }
  return index;
}

export function matchBbrRefereeName(
  bbrName: string,
  index: Map<string, RefNameMatchResult>,
): RefNameMatchResult | null {
  return index.get(normalizeRefName(bbrName)) ?? null;
}

function mergeTeamStat(
  existing: RefTeamStat | undefined,
  wl: { games: number; wins: number; losses: number; winRate: number },
  leagueAvgTotal: number,
): RefTeamStat {
  return {
    games: wl.games,
    wins: wl.wins,
    losses: wl.losses,
    winRate: wl.winRate,
    avgFoulDifferential: existing?.avgFoulDifferential ?? 0,
    avgTotalPoints: existing?.avgTotalPoints ?? leagueAvgTotal,
    overRate: existing?.overRate ?? round3(0.5),
  };
}

function hybridNote(base: RefStatsFile, seasons: string[]): string {
  const parts = [
    `Ref×team W-L from Basketball-Reference (${seasons.join(", ")}).`,
  ];
  if (base.meta.source === "seeded") {
    parts.push(
      "Foul, scoring, and ATS/O-U splits use simulated or estimated data.",
    );
  } else if (base.meta.source === "nba-stats-api") {
    parts.push(
      "Foul and scoring from NBA Stats API; ATS/O-U per existing line source.",
    );
  }
  if (base.meta.note && !base.meta.note.includes("Basketball-Reference")) {
    parts.push(base.meta.note);
  }
  return parts.join(" ");
}

export function applyBbrRefTeamStats(
  base: RefStatsFile,
  fixture: BbrRefTeamRecordsFile,
): ApplyBbrResult {
  const index = buildRefNameIndex(base.refs);
  const slugByNorm = new Map<string, string>();
  for (const ref of base.refs) {
    slugByNorm.set(normalizeRefName(ref.name), ref.slug);
  }

  /** slug → team → aggregated BBR rows */
  const bbrBySlugTeam = new Map<
    string,
    Map<string, { games: number; wins: number; losses: number }>
  >();
  const unmatched = new Set<string>();

  for (const entry of fixture.entries) {
    if (!base.meta.seasons.includes(entry.season)) continue;
    for (const row of entry.referees) {
      const match = matchBbrRefereeName(row.referee, index);
      if (!match) {
        unmatched.add(row.referee);
        continue;
      }
      const byTeam = bbrBySlugTeam.get(match.slug) ?? new Map();
      const prev = byTeam.get(entry.team) ?? { games: 0, wins: 0, losses: 0 };
      byTeam.set(entry.team, {
        games: prev.games + row.games,
        wins: prev.wins + row.wins,
        losses: prev.losses + row.losses,
      });
      bbrBySlugTeam.set(match.slug, byTeam);
    }
  }

  const refs = base.refs.map((ref) => {
    const bbrTeams = bbrBySlugTeam.get(ref.slug);
    if (!bbrTeams || bbrTeams.size === 0) return ref;

    const teamStats: Record<string, RefTeamStat> = { ...(ref.teamStats ?? {}) };
    for (const [teamAbbr, wl] of bbrTeams) {
      const winRate = wl.games > 0 ? round3(wl.wins / wl.games) : 0;
      teamStats[teamAbbr] = mergeTeamStat(teamStats[teamAbbr], {
        games: wl.games,
        wins: wl.wins,
        losses: wl.losses,
        winRate,
      }, base.meta.leagueAvgTotal);
    }
    return { ...ref, teamStats };
  });

  let matchedPairs = 0;
  for (const [, teams] of bbrBySlugTeam) {
    matchedPairs += teams.size;
  }

  const seasons =
    fixture.seasons.length > 0 ? fixture.seasons : base.meta.seasons;

  const stats: RefStatsFile = {
    ...base,
    meta: {
      ...base.meta,
      lastUpdated: new Date().toISOString(),
      refTeamWinLossSource: "basketball-reference",
      note: hybridNote(base, seasons),
    },
    refs,
  };

  return {
    stats,
    matchedPairs,
    unmatchedReferees: [...unmatched].sort(),
  };
}

export function loadRefStatsBase(): RefStatsFile {
  const dataDir = path.join(process.cwd(), "data");
  const mainPath = path.join(dataDir, "ref-stats.json");
  const seedPath = path.join(dataDir, "ref-stats.seed.json");
  try {
    return JSON.parse(fs.readFileSync(mainPath, "utf8")) as RefStatsFile;
  } catch {
    return JSON.parse(fs.readFileSync(seedPath, "utf8")) as RefStatsFile;
  }
}

/** Sanity check: Kogut×TOR aggregate from fixture (for logging). */
export function kogutTorAggregate(
  fixture: BbrRefTeamRecordsFile,
  seasons?: string[],
) {
  return aggregateBbrRefTeamRecords(fixture, "Marat Kogut", "TOR", seasons);
}
