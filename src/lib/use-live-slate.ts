"use client";

import useSWR from "swr";
import type { LeagueId } from "@/lib/leagues";
import type { LiveSlateResult } from "@/lib/live-slate-engine";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { isEspnGameLive } from "@/lib/slate-game-phase";

const LIVE_POLL_MS = 15_000;
const UPCOMING_POLL_MS = 60_000;

export type LiveSlatePayload = LiveSlateResult;

async function fetchLiveSlate(url: string): Promise<LiveSlatePayload> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Live slate fetch failed: ${res.status}`);
  }
  return (await res.json()) as LiveSlatePayload;
}

export function buildLiveSlateUrl(options?: {
  leagueId?: LeagueId;
  limit?: number;
}): string {
  const params = new URLSearchParams();
  if (options?.leagueId) params.set("league", options.leagueId);
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return query ? `/api/slate?${query}` : "/api/slate";
}

export function slateHasLiveGames(games: OverviewSlateEntry[] | undefined): boolean {
  if (!games || games.length === 0) return false;
  return games.some(
    (game) =>
      game.status === "live" ||
      game.gamePhase === "live" ||
      isEspnGameLive(game.gameStatus),
  );
}

export function useLiveSlate(options?: {
  leagueId?: LeagueId;
  limit?: number;
  initialData?: LiveSlatePayload;
  initialGames?: OverviewSlateEntry[];
  enabled?: boolean;
}) {
  const url = buildLiveSlateUrl({
    leagueId: options?.leagueId,
    limit: options?.limit,
  });
  const enabled = options?.enabled ?? true;

  const { data, error, isLoading, isValidating, mutate } = useSWR<LiveSlatePayload>(
    enabled ? url : null,
    fetchLiveSlate,
    {
      fallbackData: options?.initialData,
      refreshInterval: (latest?: LiveSlatePayload) =>
        slateHasLiveGames(latest?.games ?? options?.initialGames) ? LIVE_POLL_MS : UPCOMING_POLL_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5_000,
    },
  );

  const games =
    data?.games && data.games.length > 0
      ? data.games
      : options?.initialData?.games && options.initialData.games.length > 0
        ? options.initialData.games
        : options?.initialGames ?? [];
  const hasLiveGames = slateHasLiveGames(games);

  return {
    games,
    slate: data ?? options?.initialData,
    hasLiveGames,
    isLoading,
    isValidating,
    error,
    refresh: () => mutate(),
    mutate,
  };
}
