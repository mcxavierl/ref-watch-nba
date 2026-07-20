"use client";

import { useState } from "react";
import { GameSlatePreviewDrawer } from "@/components/GameSlatePreviewDrawer";
import { OverviewSlateRow } from "@/components/OverviewSlateRow";
import { UpcomingGameCard } from "@/components/UpcomingGameCard";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";

export function OverviewSlateGamesInteractive({
  games,
  showHubLink = true,
  variant = "row",
}: {
  games: OverviewSlateEntry[];
  showHubLink?: boolean;
  variant?: "row" | "card";
}) {
  const [selected, setSelected] = useState<GameSlatePreviewPayload | null>(null);

  const previewByKey = new Map(
    games
      .filter((game): game is OverviewSlateEntry & { preview: GameSlatePreviewPayload } =>
        Boolean(game.preview),
      )
      .map((game) => [`${game.leagueId}:${game.gameId}`, game.preview]),
  );

  const openPreview = (game: OverviewSlateEntry) => {
    const preview = previewByKey.get(`${game.leagueId}:${game.gameId}`);
    if (preview) setSelected(preview);
  };

  return (
    <>
      {games.map((game, index) =>
        variant === "card" ? (
          <UpcomingGameCard
            key={`${game.leagueId}-${game.gameId}`}
            game={game}
            index={index}
            onOpenPreview={
              previewByKey.has(`${game.leagueId}:${game.gameId}`)
                ? () => openPreview(game)
                : undefined
            }
          />
        ) : (
          <OverviewSlateRow
            key={`${game.leagueId}-${game.gameId}`}
            game={game}
            showHubLink={showHubLink}
            onOpenPreview={
              previewByKey.has(`${game.leagueId}:${game.gameId}`)
                ? () => openPreview(game)
                : undefined
            }
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
