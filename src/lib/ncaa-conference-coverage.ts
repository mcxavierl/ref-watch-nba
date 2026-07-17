import type { StatusBadgeVerdict } from "@/components/hub/StatusBadge";
import {
  getCachedCbbConferenceCoverage,
} from "@/lib/cbb/conference-coverage-preload";
import { getRefStats } from "@/lib/cbb/data";
import { getCachedGameLogs } from "@/lib/game-logs-preload";
import {
  LIVE_NCAA_CONFERENCES,
  resolveTeamConference,
  type LiveNcaaConferenceId,
  type NcaaRouteLeague,
} from "@/lib/ncaa-conference-gate";
import * as fs from "node:fs";
import * as path from "node:path";

export type NcaaConferenceMaturityTier = "partial" | "building" | "live";

export type NcaaConferenceCoverageRow = {
  conferenceId: LiveNcaaConferenceId;
  distinctGames: number;
  tier: NcaaConferenceMaturityTier;
  label: string;
  verdict: StatusBadgeVerdict;
};

export type ConferenceCoverageDisplayRow = {
  conferenceId: LiveNcaaConferenceId;
  name: string;
  maturity: string;
  verdict: StatusBadgeVerdict;
  distinctGames: number;
};

/** Internal allowlist IDs → user-facing conference names. */
const CONFERENCE_DISPLAY_RECORD: Record<LiveNcaaConferenceId, string> = {
  ACC: "Atlantic Coast Conference",
  "Big Ten": "Big Ten Conference",
  "Big 12": "Big 12 Conference",
  SEC: "Southeastern Conference",
  "Big East": "Big East Conference",
};

const PARTIAL_MAX = 299;
const BUILDING_MAX = 499;

export function ncaaConferenceMaturityTier(
  distinctGames: number,
): NcaaConferenceMaturityTier {
  if (distinctGames >= BUILDING_MAX + 1) return "live";
  if (distinctGames >= PARTIAL_MAX + 1) return "building";
  return "partial";
}

export function ncaaConferenceMaturityLabel(tier: NcaaConferenceMaturityTier): string {
  switch (tier) {
    case "live":
      return "Live";
    case "building":
      return "Building";
    case "partial":
      return "Partial";
  }
}

export function ncaaConferenceMaturityVerdict(
  tier: NcaaConferenceMaturityTier,
): StatusBadgeVerdict {
  return tier === "live" ? "pass" : "caution";
}

export function countDistinctGamesByConference(
  games: readonly { gameId: string; homeTeam: string; awayTeam: string }[],
  resolveConference: (teamAbbr: string) => LiveNcaaConferenceId | null,
  conferenceIds: readonly LiveNcaaConferenceId[],
): Record<LiveNcaaConferenceId, number> {
  const allowed = new Set(conferenceIds);
  const byConf = Object.fromEntries(
    conferenceIds.map((id) => [id, new Set<string>()]),
  ) as Record<LiveNcaaConferenceId, Set<string>>;

  for (const game of games) {
    const home = resolveConference(game.homeTeam);
    const away = resolveConference(game.awayTeam);
    const territory =
      home && allowed.has(home)
        ? home
        : away && allowed.has(away)
          ? away
          : null;
    if (!territory) continue;
    byConf[territory].add(game.gameId);
  }

  return Object.fromEntries(
    conferenceIds.map((id) => [id, byConf[id].size]),
  ) as Record<LiveNcaaConferenceId, number>;
}

export function buildNcaaConferenceCoverageRows(
  distinctByConference: Record<LiveNcaaConferenceId, number>,
  conferenceIds: readonly LiveNcaaConferenceId[],
): NcaaConferenceCoverageRow[] {
  return conferenceIds.map((conferenceId) => {
    const distinctGames = distinctByConference[conferenceId] ?? 0;
    const tier = ncaaConferenceMaturityTier(distinctGames);
    return {
      conferenceId,
      distinctGames,
      tier,
      label: ncaaConferenceMaturityLabel(tier),
      verdict: ncaaConferenceMaturityVerdict(tier),
    };
  });
}

function resolveTeamConferenceForCoverage(
  teamAbbr: string,
): LiveNcaaConferenceId | null {
  const territory = resolveTeamConference("cbb", teamAbbr);
  if (
    !territory ||
    !LIVE_NCAA_CONFERENCES.includes(territory as LiveNcaaConferenceId)
  ) {
    return null;
  }
  return territory as LiveNcaaConferenceId;
}

function readCbbGameLogsFromDisk(): {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
}[] {
  const filePath = path.join(process.cwd(), "data", "cbb", "game-logs.json");
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    games?: { gameId: string; homeTeam: string; awayTeam: string }[];
  };
  return parsed.games ?? [];
}

function readCbbCoverageFromRefStatsMeta(): Record<
  LiveNcaaConferenceId,
  number
> | null {
  try {
    const meta = getRefStats().meta;
    const distinct = meta.conferenceCoverageDistinctGames;
    if (!distinct) return null;
    const totalGames = LIVE_NCAA_CONFERENCES.reduce(
      (sum, conferenceId) => sum + (distinct[conferenceId] ?? 0),
      0,
    );
    if (totalGames <= 0) return null;
    return Object.fromEntries(
      LIVE_NCAA_CONFERENCES.map((conferenceId) => [
        conferenceId,
        distinct[conferenceId] ?? 0,
      ]),
    ) as Record<LiveNcaaConferenceId, number>;
  } catch {
    return null;
  }
}

function readCbbConferenceSnapshotFromDisk(): Record<
  LiveNcaaConferenceId,
  number
> | null {
  for (const rel of [
    "public/data/cbb/conference-coverage.json",
    "data/cbb/conference-coverage.json",
  ]) {
    const filePath = path.join(process.cwd(), rel);
    if (!fs.existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
        distinctByConference?: Record<LiveNcaaConferenceId, number>;
      };
      if (parsed.distinctByConference) {
        return parsed.distinctByConference;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function resolveCbbDistinctGamesByConference(): Record<
  LiveNcaaConferenceId,
  number
> {
  const snapshot = getCachedCbbConferenceCoverage();
  if (snapshot?.distinctByConference) {
    const totalGames = Object.values(snapshot.distinctByConference).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (totalGames > 0) {
      return snapshot.distinctByConference;
    }
  }

  const fromDisk = readCbbConferenceSnapshotFromDisk();
  if (fromDisk) {
    return fromDisk;
  }

  const fromRefStats = readCbbCoverageFromRefStatsMeta();
  if (fromRefStats) {
    return fromRefStats;
  }

  const cachedLogs = getCachedGameLogs("CBB");
  if (cachedLogs?.games?.length) {
    return countDistinctGamesByConference(
      cachedLogs.games,
      resolveTeamConferenceForCoverage,
      LIVE_NCAA_CONFERENCES,
    );
  }

  return countDistinctGamesByConference(
    readCbbGameLogsFromDisk(),
    resolveTeamConferenceForCoverage,
    LIVE_NCAA_CONFERENCES,
  );
}

/** Server-side rows for ConferenceCoverage (CBB only today). */
export function getConferenceCoverageRows(
  leagueId: NcaaRouteLeague,
): ConferenceCoverageDisplayRow[] {
  if (leagueId !== "cbb") {
    return LIVE_NCAA_CONFERENCES.map((conferenceId) => ({
      conferenceId,
      name: CONFERENCE_DISPLAY_RECORD[conferenceId],
      maturity: "Partial",
      verdict: "caution" as const,
      distinctGames: 0,
    }));
  }

  const distinctByConference = resolveCbbDistinctGamesByConference();

  return buildNcaaConferenceCoverageRows(distinctByConference, LIVE_NCAA_CONFERENCES).map(
    (row) => ({
      conferenceId: row.conferenceId,
      name: CONFERENCE_DISPLAY_RECORD[row.conferenceId],
      maturity: row.label,
      verdict: row.verdict,
      distinctGames: row.distinctGames,
    }),
  );
}
