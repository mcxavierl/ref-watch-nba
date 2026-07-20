"use client";

import { useState } from "react";
import { GameSlateCard } from "@/components/GameSlateCard";
import { GameSlatePreviewDrawer } from "@/components/GameSlatePreviewDrawer";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { ComponentProps } from "react";

type GameSlateCardProps = ComponentProps<typeof GameSlateCard>;

export type SlateGamePreviewBundle = {
  gameId: string;
  card: GameSlateCardProps;
  preview: GameSlatePreviewPayload;
};

export function SlateGamePreviewHost({ games }: { games: SlateGamePreviewBundle[] }) {
  const [selected, setSelected] = useState<GameSlatePreviewPayload | null>(null);

  return (
    <>
      {games.map(({ gameId, card, preview }) => (
        <div key={gameId} id={`slate-game-${gameId}`}>
          <GameSlateCard
            {...card}
            onOpenPreview={() => setSelected(preview)}
          />
        </div>
      ))}
      <GameSlatePreviewDrawer
        preview={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
