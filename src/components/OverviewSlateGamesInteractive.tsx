"use client";

import { useState } from "react";
import { GameSlatePreviewDrawer } from "@/components/GameSlatePreviewDrawer";
import { OverviewSlateRow } from "@/components/OverviewSlateRow";
import { UpcomingGameCard } from "@/components/UpcomingGameCard";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { normalizeGameSlatePreview } from "@/lib/normalize-game-slate-preview";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { useSlateLiveScores } from "@/lib/use-slate-live-scores";

function resolvePreviewForGame(
  game: OverviewSlateEntry,
  previewByKey: Map<string, GameSlatePreviewPayload>,
): GameSlatePreviewPayload | null {
  const raw =
    previewByKey.get(`${game.leagueId}:${game.gameId}`) ?? game.preview ?? null;
  return normalizeGameSlatePreview(raw);
}

export function OverviewSlateGamesInteractive({
  games,
  showHubLink = true,
  variant = "row",
  liveData = false,
}: {
  games: OverviewSlateEntry[];
  showHubLink?: boolean;
  variant?: "row" | "card";
  /** When true, games are already merged from /api/slate and skip score polling. */
  liveData?: boolean;
}) {
  const [selected, setSelected] = useState<GameSlatePreviewPayload | null>(null);
  const polledGames = useSlateLiveScores(liveData ? [] : games);
  const liveGames = liveData ? games : polledGames;

  const previewByKey = new Map<string, GameSlatePreviewPayload>();
  for (const game of liveGames) {
    const preview = normalizeGameSlatePreview(game.preview);
    if (preview) {
      previewByKey.set(`${game.leagueId}:${game.gameId}`, preview);
    }
  }

  const openPreview = (game: OverviewSlateEntry) => {
    const preview = resolvePreviewForGame(game, previewByKey);
    if (preview) setSelected(preview);
  };

  const hasPreview = (game: OverviewSlateEntry) =>
    resolvePreviewForGame(game, previewByKey) !== null;

  return (
    <>
      {liveGames.map((game, index) =>
        variant === "card" ? (
          <UpcomingGameCard
            key={`${game.leagueId}-${game.gameId}`}
            game={game}
            index={index}
            onOpenPreview={hasPreview(game) ? () => openPreview(game) : undefined}
          />
        ) : (
          <OverviewSlateRow
            key={`${game.leagueId}-${game.gameId}`}
            game={game}
            showHubLink={showHubLink}
            onOpenPreview={hasPreview(game) ? () => openPreview(game) : undefined}
          />
        ),
      )}
      <GameSlatePreviewDrawer
        preview={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
