import { loadRuntimeGameLogs, type DataLeague } from "@/lib/game-logs";
import { lookupNflPenaltyEventsForGame } from "@/lib/nfl/penalty-events-cache";
import type { LeagueId } from "@/lib/leagues";
import {
  classifyFoulName,
  FoulCategory,
} from "@/lib/types/foul-categories";
import type { NflPenaltyEvent } from "@/lib/types";
import type { RefProfileFoulRecord } from "@/lib/ref-profile-fouls";

const LEAGUE_TO_DATA: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  nfl: "NFL",
  wnba: "WNBA",
};

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function gameIncludesRef(
  officials: { name: string; number: number }[],
  targetSlug: string,
): boolean {
  return officials.some(
    (official) => refSlug(official.name, official.number) === targetSlug,
  );
}

function penaltyEventToRecord(
  event: NflPenaltyEvent,
  context: { gameId: string; date: string; matchup: string; index: number },
): RefProfileFoulRecord {
  const label = event.rawType?.trim() || event.type;
  return {
    id: `${context.gameId}:${context.index}:${label}`,
    label,
    gameId: context.gameId,
    date: context.date,
    matchup: context.matchup,
    team: event.team,
    yards: event.yards,
    category: event.category ?? classifyFoulName("nfl", label),
  };
}

type NbaGameFoul = NonNullable<
  import("@/lib/game-logs-preload").RuntimeGameLogEntry["fouls"]
>[number];

function nbaFoulToRecord(
  foul: NbaGameFoul,
  context: { gameId: string; date: string; matchup: string; index: number },
): RefProfileFoulRecord | null {
  const label = (foul.foulName ?? foul.rawType ?? foul.type ?? "").trim();
  if (!label) return null;
  return {
    id: `${context.gameId}:${context.index}:${label}`,
    label,
    gameId: context.gameId,
    date: context.date,
    matchup: context.matchup,
    team: foul.team,
    category: foul.category ?? classifyFoulName("nba", label),
  };
}

/** Collect tagged fouls from runtime game logs for one official profile. */
export function buildRefProfileFouls(
  refSlugValue: string,
  leagueId: LeagueId,
  limit = 250,
): RefProfileFoulRecord[] {
  const dataLeague = LEAGUE_TO_DATA[leagueId];
  if (!dataLeague) return [];

  const logs = loadRuntimeGameLogs(dataLeague);
  if (!logs?.games.length) return [];

  const fouls: RefProfileFoulRecord[] = [];

  for (const game of logs.games) {
    if (!gameIncludesRef(game.officials, refSlugValue)) continue;

    const matchup = `${game.awayTeam} @ ${game.homeTeam}`;
    const context = {
      gameId: game.gameId,
      date: game.date,
      matchup,
    };

    if (leagueId === "nfl") {
      const events = lookupNflPenaltyEventsForGame({
        gameId: game.gameId,
        date: game.date,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        penaltyEvents: game.penaltyEvents,
      });
      events.forEach((event, index) => {
        if (!event.accepted) return;
        fouls.push(
          penaltyEventToRecord(event, {
            ...context,
            index,
          }),
        );
      });
    }

    const nbaFouls = game.fouls;
    if (leagueId === "nba" && nbaFouls?.length) {
      nbaFouls.forEach((foul, index) => {
        const record = nbaFoulToRecord(foul, { ...context, index });
        if (record) fouls.push(record);
      });
    }
  }

  return fouls
    .sort((a, b) => b.date.localeCompare(a.date) || a.label.localeCompare(b.label))
    .slice(0, limit);
}
