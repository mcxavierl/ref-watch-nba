import { buildGameSlatePreview, selectGameSlatePreviewCardInsights } from "@/lib/game-slate-preview";
import { isSlatePreviewLeague } from "@/lib/game-slate-preview-adapters";
import { loadLeagueOddsShard } from "@/lib/league-odds";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import type { AssignmentGame, RefOfficial } from "@/lib/types";

const LEAGUE_LABEL: Record<string, AssignmentGame["league"]> = {
  nba: "NBA",
  wnba: "WNBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

export function assignmentGameFromOverviewEntry(
  entry: OverviewSlateEntry,
  crew: RefOfficial[],
): AssignmentGame {
  return {
    id: entry.gameId,
    matchup: entry.matchup,
    awayTeam: entry.awayTeam,
    homeTeam: entry.homeTeam,
    league: LEAGUE_LABEL[entry.leagueId] ?? "NBA",
    slateDate: entry.slateDate,
    slateStartAt: entry.slateStartAt,
    crew,
  };
}

export function previewNeedsHydration(
  entry: OverviewSlateEntry,
  crew: RefOfficial[],
): boolean {
  if (!isSlatePreviewLeague(entry.leagueId) || crew.length === 0) return false;
  const preview = entry.preview;
  if (!preview) return true;
  if (preview.awaitingCrew || preview.crew.length === 0) return true;
  if (preview.avgFouls <= 0 && preview.sampleGames <= 0) return true;
  return false;
}

export function hydrateOverviewSlatePreview(
  entry: OverviewSlateEntry,
  crew: RefOfficial[],
): OverviewSlateEntry {
  if (!previewNeedsHydration(entry, crew)) return entry;
  if (!isSlatePreviewLeague(entry.leagueId)) return entry;

  const preview =
    buildGameSlatePreview(
      entry.leagueId,
      assignmentGameFromOverviewEntry(entry, crew),
      loadLeagueOddsShard(entry.leagueId),
    ) ?? entry.preview;

  if (!preview) return entry;

  return {
    ...entry,
    preview,
    previewCardInsights: selectGameSlatePreviewCardInsights(preview, 3),
  };
}
