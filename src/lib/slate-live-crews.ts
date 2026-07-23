import type { LeagueId } from "@/lib/leagues";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { RefOfficial } from "@/lib/types";

export type SlateLiveCrew = {
  leagueId: LeagueId;
  gameId: string;
  crew: RefOfficial[];
  preview?: GameSlatePreviewPayload;
  previewCardInsights?: string[];
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

export function mergeSlateLiveCrews(
  games: OverviewSlateEntry[],
  crews: SlateLiveCrew[],
): OverviewSlateEntry[] {
  if (crews.length === 0) return games;

  const crewByKey = new Map(
    crews.map((crew) => [`${crew.leagueId}:${crew.gameId}`, crew]),
  );

  return games.map((game) => {
    const update = crewByKey.get(`${game.leagueId}:${game.gameId}`);
    if (!update || update.crew.length === 0) return game;

    const headRef =
      update.crew.find((official) => official.role === "referee")?.name ??
      update.crew[0]?.name;

    return {
      ...game,
      crewCount: update.crew.length,
      headRef,
      officialsLine:
        game.leagueId === "wnba"
          ? wnbaOfficialsLine(update.crew)
          : game.officialsLine,
      status: game.status === "scheduled" ? "live" : game.status,
      ...(update.preview
        ? {
            preview: update.preview,
            previewCardInsights: update.previewCardInsights,
          }
        : {}),
    };
  });
}
