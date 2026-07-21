"use client";

import { useState } from "react";
import { GameSlateCard } from "@/components/GameSlateCard";
import { GameSlatePreviewDrawer } from "@/components/GameSlatePreviewDrawer";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { ComponentProps } from "react";

type GameSlateCardProps = ComponentProps<typeof GameSlateCard>;

export type SlateGamePreviewBundle = {
  gameId: string;
  card: GameSlateCardProps;
  preview?: GameSlatePreviewPayload;
};

export function SlateGamePreviewHost({ games }: { games: SlateGamePreviewBundle[] }) {
  const [selected, setSelected] = useState<GameSlatePreviewPayload | null>(null);

  return (
    <>
      {games.map(({ gameId, card, preview }) => (
        <div key={gameId} id={`slate-game-${gameId}`}>
          <GameSlateCard
            {...card}
            projectionEvidence={preview ? buildProjectionEvidence(preview) : null}
            onOpenPreview={preview ? () => setSelected(preview) : undefined}
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
