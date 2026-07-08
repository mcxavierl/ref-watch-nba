"use client";

import { useSearchParams } from "next/navigation";
import {
  canRenderLeagueStats,
  filterVerifiedSeasons,
  resolveLeagueVerification,
  type LeagueVerification,
} from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import type { RefStatsFile } from "@/lib/types";
import { isPreviewQuery, isShowUnverifiedEnv } from "@/lib/show-unverified";

export type VerifiedLeagueData = LeagueVerification & {
  previewMode: boolean;
  canRenderStats: boolean;
};

export function useVerifiedLeagueData(
  leagueId: LeagueId,
  meta: RefStatsFile["meta"],
): VerifiedLeagueData {
  const searchParams = useSearchParams();
  const preview =
    isShowUnverifiedEnv() ||
    isPreviewQuery({ preview: searchParams.get("preview") });

  const verification = resolveLeagueVerification(leagueId, meta);
  const canRender = canRenderLeagueStats(leagueId, meta, preview);

  return {
    ...verification,
    previewMode: preview,
    canRenderStats: canRender,
  };
}

export function useVerifiedSeasons(
  leagueId: LeagueId,
  meta: RefStatsFile["meta"],
  seasons: string[],
): string[] {
  const { previewMode } = useVerifiedLeagueData(leagueId, meta);
  return filterVerifiedSeasons(leagueId, meta, seasons, previewMode);
}
