"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_SEASON_SCOPE_MODE,
  parseSeasonScopeMode,
  type SeasonScopeMode,
} from "@/lib/season-scope";

export function useSeasonScope(): {
  mode: SeasonScopeMode;
  setMode: (mode: SeasonScopeMode) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = parseSeasonScopeMode(searchParams?.get("scope") ?? null);

  const setMode = useCallback(
    (next: SeasonScopeMode) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next === DEFAULT_SEASON_SCOPE_MODE) {
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
    [pathname, router, searchParams],
  );

  return { mode, setMode };
}
