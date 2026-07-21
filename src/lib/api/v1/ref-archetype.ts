import { resolveOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import { generateScoutingReport } from "@/lib/analytics/generate-scouting-report";
import { computeRefStarDeference } from "@/lib/ref-star-deference";
import { profileDisposition } from "@/lib/whistle-disposition";
import { isWhistleTaxonomyLeague } from "@/config/penalty-types";
import type { LeagueId } from "@/lib/leagues";
import type { OfficialStats, RefProfile } from "@/lib/types";

export type RefereeArchetypeApiPayload = {
  officialId: string;
  leagueId: LeagueId;
  name: string;
  games: number;
  archetype: OfficialStats["primary_archetype"];
  consistencyScore: number;
  leverageSensitivityIndex: number | null;
  disparityIndex: number | null;
  disparityDisplay: string | null;
  momentumKillerScore: number | null;
  runStoppageRate: number | null;
  adminRatio: number;
  pressureSensitive: boolean;
  pressureDeltaPct: number | null;
  whistleDisposition: {
    subjectiveShare: number;
    lwisPerGame: number;
    lwisDelta: number;
    highLeverageEventCount: number;
  } | null;
  scoutingReport: ReturnType<typeof generateScoutingReport>;
};

function officialStats(profile: RefProfile): OfficialStats | null {
  return profile.officialStats ?? null;
}

export function buildRefereeArchetypePayload(
  officialId: string,
  leagueId: LeagueId,
): RefereeArchetypeApiPayload | null {
  const resolved = resolveOfficialProfile(officialId, leagueId);
  if (!resolved) return null;

  const stats = officialStats(resolved.profile);
  const scoutingReport = generateScoutingReport(
    officialId,
    { leagueId },
    resolved,
  );
  const starDeference = computeRefStarDeference(leagueId, resolved.profile);
  const disposition = isWhistleTaxonomyLeague(leagueId)
    ? profileDisposition(resolved.profile, leagueId)
    : null;

  return {
    officialId,
    leagueId,
    name: resolved.profile.name,
    games: resolved.profile.games,
    archetype: stats?.primary_archetype ?? scoutingReport?.archetype ?? "balanced",
    consistencyScore:
      stats?.consistency_score ?? scoutingReport?.consistencyScore ?? 5,
    leverageSensitivityIndex:
      stats?.leverage_index ?? scoutingReport?.leverageSensitivityIndex ?? null,
    disparityIndex: starDeference?.star_deference_index ?? null,
    disparityDisplay: starDeference?.star_deference_display ?? null,
    momentumKillerScore:
      stats?.momentum_killer_score ?? scoutingReport?.momentumKillerScore ?? null,
    runStoppageRate: stats?.run_stoppage_rate ?? scoutingReport?.runStoppageRate ?? null,
    adminRatio: stats?.admin_ratio ?? 0,
    pressureSensitive: stats?.pressure_sensitive ?? false,
    pressureDeltaPct: stats?.pressure_delta_pct ?? null,
    whistleDisposition: disposition
      ? {
          subjectiveShare: disposition.subjectiveShare,
          lwisPerGame: disposition.lwisPerGame,
          lwisDelta: disposition.lwisDelta,
          highLeverageEventCount: disposition.highLeverageEventCount,
        }
      : null,
    scoutingReport,
  };
}
