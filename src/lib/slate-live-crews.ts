import type { LeagueId } from "@/lib/leagues";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  fetchWnbaEspnOfficials,
  mapWnbaEspnOfficials,
} from "@/lib/wnba/espn-officials";
import type { RefOfficial } from "@/lib/types";

export type SlateLiveCrew = {
  leagueId: LeagueId;
  gameId: string;
  crew: RefOfficial[];
};

function wnbaOfficialsLine(crew: RefOfficial[]): string {
  if (crew.length === 0) return "Refs not assigned yet";
  const headRef =
    crew.find((official) => official.role === "referee")?.name ?? crew[0]?.name;
  if (!headRef) return `${crew.length}-person crew`;
  return crew.length > 1
    ? `Head ref ${headRef} · ${crew.length}-person crew`
    : `Head ref ${headRef}`;
}

export async function fetchSlateLiveCrews(
  games: OverviewSlateEntry[],
): Promise<SlateLiveCrew[]> {
  const crews: SlateLiveCrew[] = [];

  for (const game of games) {
    if (game.leagueId !== "wnba" || game.crewCount > 0) continue;
    const officials = await fetchWnbaEspnOfficials(game.gameId);
    if (officials.length === 0) continue;
    crews.push({
      leagueId: game.leagueId,
      gameId: game.gameId,
      crew: mapWnbaEspnOfficials(officials),
    });
  }

  return crews;
}

export function mergeSlateLiveCrews(
  games: OverviewSlateEntry[],
  crews: SlateLiveCrew[],
): OverviewSlateEntry[] {
  if (crews.length === 0) return games;

  const crewByKey = new Map(
    crews.map((crew) => [`${crew.leagueId}:${crew.gameId}`, crew.crew]),
  );

  return games.map((game) => {
    const crew = crewByKey.get(`${game.leagueId}:${game.gameId}`);
    if (!crew || crew.length === 0) return game;

    const headRef =
      crew.find((official) => official.role === "referee")?.name ?? crew[0]?.name;
    return {
      ...game,
      crewCount: crew.length,
      headRef,
      officialsLine:
        game.leagueId === "wnba"
          ? wnbaOfficialsLine(crew)
          : game.officialsLine,
      status: game.status === "scheduled" ? "live" : game.status,
    };
  });
}
