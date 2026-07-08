"use client";

import type { ReactNode } from "react";
import { useVerifiedLeagueData } from "@/hooks/useVerifiedLeagueData";
import type { LeagueId } from "@/lib/leagues";
import type { RefStatsFile } from "@/lib/types";

type VerifiedStatProps = {
  leagueId: LeagueId;
  meta: RefStatsFile["meta"];
  children: ReactNode;
  fallback?: ReactNode;
};

/** Renders numeric stats only when league data is verified (or preview mode). */
export function VerifiedStat({
  leagueId,
  meta,
  children,
  fallback = null,
}: VerifiedStatProps) {
  const { canRenderStats } = useVerifiedLeagueData(leagueId, meta);
  if (!canRenderStats) return <>{fallback}</>;
  return <>{children}</>;
}
