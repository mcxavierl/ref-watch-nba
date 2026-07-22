"use client";

import { useEffect, useMemo, useState } from "react";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { mergeSlateLiveScores } from "@/lib/slate-live-scores";
import { mergeSlateLiveCrews } from "@/lib/slate-live-crews";
import type { SlateLiveScore } from "@/lib/slate-game-phase";
import type { SlateLiveCrew } from "@/lib/slate-live-crews";

const POLL_INTERVAL_MS = 30_000;

export function useSlateLiveScores(games: OverviewSlateEntry[]): OverviewSlateEntry[] {
  const [scores, setScores] = useState<SlateLiveScore[]>([]);
  const [crews, setCrews] = useState<SlateLiveCrew[]>([]);

  const requestKey = useMemo(
    () =>
      games
        .map((game) => `${game.leagueId}:${game.gameId}:${game.slateDate ?? ""}`)
        .join("|"),
    [games],
  );

  useEffect(() => {
    if (games.length === 0) {
      setScores([]);
      setCrews([]);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch("/api/slate/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ games }),
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          scores?: SlateLiveScore[];
          crews?: SlateLiveCrew[];
        };
        if (!cancelled) {
          setScores(body.scores ?? []);
          setCrews(body.crews ?? []);
        }
      } catch {
        /* ignore transient score refresh failures */
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [games, requestKey]);

  return useMemo(
    () => mergeSlateLiveCrews(mergeSlateLiveScores(games, scores), crews),
    [games, scores, crews],
  );
}
