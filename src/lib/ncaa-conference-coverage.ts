import type { StatusBadgeVerdict } from "@/components/hub/StatusBadge";
import { getCachedGameLogs, type DataLeague } from "@/lib/game-logs-preload";
import {
  LIVE_NCAA_CONFERENCES,
  resolveTeamConference,
  type LiveNcaaConferenceId,
  type NcaaRouteLeague,
} from "@/lib/ncaa-conference-gate";
import * as fs from "node:fs";
import * as path from "node:path";

const ROUTE_TO_DATA_LEAGUE: Record<NcaaRouteLeague, DataLeague> = {
  cbb: "CBB",
  cfb: "CFB",
};

type GameLogCoverageRow = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
};

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

function readNcaaGameLogsFromDisk(leagueId: NcaaRouteLeague): GameLogCoverageRow[] {
  try {
    const filePath = path.join(process.cwd(), "data", leagueId, "game-logs.json");
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      games?: GameLogCoverageRow[];
    };
    return parsed.games ?? [];
  } catch {
    return [];
  }
}

/** Prefer SSR-hydrated game logs on Workers; fall back to data/ on Node. */
function readNcaaGameLogs(leagueId: NcaaRouteLeague): GameLogCoverageRow[] {
  const cached = getCachedGameLogs(ROUTE_TO_DATA_LEAGUE[leagueId]);
  if (cached?.games?.length) {
    return cached.games.map((game) => ({
      gameId: game.gameId,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
    }));
  }
  return readNcaaGameLogsFromDisk(leagueId);
}

function resolveLiveConference(
  leagueId: NcaaRouteLeague,
  teamAbbr: string,
): LiveNcaaConferenceId | null {
  const territory = resolveTeamConference(leagueId, teamAbbr);
  if (!territory || !LIVE_NCAA_CONFERENCES.includes(territory as LiveNcaaConferenceId)) {
    return null;
  }
  return territory as LiveNcaaConferenceId;
}

/** Server-side rows for ConferenceCoverage from hydrated or on-disk game logs. */
export function getConferenceCoverageRows(
  leagueId: NcaaRouteLeague,
): ConferenceCoverageDisplayRow[] {
  const games = readNcaaGameLogs(leagueId);
  const distinctByConference = countDistinctGamesByConference(
    games,
    (teamAbbr) => resolveLiveConference(leagueId, teamAbbr),
    LIVE_NCAA_CONFERENCES,
  );

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
