import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  hydrateOverviewSlatePreview,
  previewNeedsHydration,
} from "@/lib/hydrate-slate-preview";
import type { RefOfficial } from "@/lib/types";
import {
  fetchWnbaEspnOfficials,
  mapWnbaEspnOfficials,
} from "@/lib/wnba/espn-officials";
import type { SlateLiveCrew } from "@/lib/slate-live-crews";

export async function fetchSlateLiveCrews(
  games: OverviewSlateEntry[],
): Promise<SlateLiveCrew[]> {
  const crews: SlateLiveCrew[] = [];

  for (const game of games) {
    if (game.leagueId !== "wnba") continue;
    const previewCrew: RefOfficial[] =
      game.preview?.crew.map((official) => ({
        name: official.name,
        number: official.number,
        role: official.role ?? "alternate",
      })) ?? [];
    if (
      game.crewCount > 0 &&
      previewCrew.length > 0 &&
      !previewNeedsHydration(game, previewCrew)
    ) {
      continue;
    }
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

export function enrichSlateLiveCrews(
  games: OverviewSlateEntry[],
  crews: SlateLiveCrew[],
): SlateLiveCrew[] {
  if (crews.length === 0) return crews;

  const gameByKey = new Map(
    games.map((game) => [`${game.leagueId}:${game.gameId}`, game]),
  );

  return crews.map((update) => {
    const game = gameByKey.get(`${update.leagueId}:${update.gameId}`);
    if (!game) return update;

    const headRef =
      update.crew.find((official) => official.role === "referee")?.name ??
      update.crew[0]?.name;
    const hydrated = hydrateOverviewSlatePreview(
      {
        ...game,
        crewCount: update.crew.length,
        headRef,
        officialsLine: game.officialsLine,
        status: game.status === "scheduled" ? "live" : game.status,
      },
      update.crew,
    );

    if (!hydrated.preview) return update;

    return {
      ...update,
      preview: hydrated.preview,
      previewCardInsights: hydrated.previewCardInsights,
    };
  });
}
