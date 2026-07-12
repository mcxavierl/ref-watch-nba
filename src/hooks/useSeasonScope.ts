"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LeagueId } from "@/lib/leagues";
import {
  defaultSeasonScopeForLeague,
  parseSeasonScopeMode,
  type SeasonScopeMode,
} from "@/lib/season-scope";

export function useSeasonScope(leagueId?: LeagueId): {
  mode: SeasonScopeMode;
  setMode: (mode: SeasonScopeMode) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultMode = defaultSeasonScopeForLeague(leagueId ?? "nba");
  const mode = parseSeasonScopeMode(searchParams?.get("scope") ?? null, leagueId);

  const setMode = useCallback(
    (next: SeasonScopeMode) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next === defaultMode) {
        params.delete("scope");
      } else {
        params.set("scope", next);
      }
      const query = params.toString();
      const resolvedPath = pathname ?? "/";
      router.replace(query ? `${resolvedPath}?${query}` : resolvedPath, {
        scroll: false,
      });
    },
    [defaultMode, pathname, router, searchParams],
  );

  return { mode, setMode };
}
