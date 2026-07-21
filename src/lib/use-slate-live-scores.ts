"use client";

import { useEffect, useMemo, useState } from "react";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { mergeSlateLiveScores } from "@/lib/slate-live-scores";
import type { SlateLiveScore } from "@/lib/slate-game-phase";

const POLL_INTERVAL_MS = 30_000;

export function useSlateLiveScores(games: OverviewSlateEntry[]): OverviewSlateEntry[] {
  const [scores, setScores] = useState<SlateLiveScore[]>([]);

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
        const body = (await res.json()) as { scores?: SlateLiveScore[] };
        if (!cancelled) {
          setScores(body.scores ?? []);
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

  return useMemo(() => mergeSlateLiveScores(games, scores), [games, scores]);
}
