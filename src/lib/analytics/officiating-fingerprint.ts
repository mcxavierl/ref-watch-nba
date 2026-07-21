import { generateScoutingReport } from "@/lib/analytics/generate-scouting-report";
import type { ResolvedOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import type { ScoutingReport } from "@/lib/analytics/scouting-report-types";
import type { LeagueId } from "@/lib/leagues";
import { computeRefStarDeference, supportsStarDeferenceLeague } from "@/lib/ref-star-deference";
import { computeRefWhistleFatigue } from "@/lib/whistle-fatigue";
import type { RefProfile, RefRole, RefStatsFile } from "@/lib/types";

export const OFFICIATING_FINGERPRINT_DIMENSIONS = [
  {
    id: "pace_acceleration",
    label: "Pace Acceleration",
    shortLabel: "Pace",
  },
  {
    id: "contact_tolerance",
    label: "Contact Tolerance",
    shortLabel: "Contact",
  },
  {
    id: "technical_escalation",
    label: "Technical Escalation",
    shortLabel: "Technical",
  },
  {
    id: "fourth_quarter_drift",
    label: "4th-Quarter Whistle Drift",
    shortLabel: "Q4 Drift",
  },
  {
    id: "home_court_disparity",
    label: "Home-Court Disparity",
    shortLabel: "Home Bias",
  },
  {
    id: "replay_overturn_propensity",
    label: "Replay Overturn Propensity",
    shortLabel: "Replay",
  },
  {
    id: "consistency_index",
    label: "Consistency Index",
    shortLabel: "Consistency",
  },
  {
    id: "star_deference_rate",
    label: "Star Deference Rate",
    shortLabel: "Star Def.",
  },
] as const;

export type OfficiatingFingerprintDimensionId =
  (typeof OFFICIATING_FINGERPRINT_DIMENSIONS)[number]["id"];

export type OfficiatingFingerprintAxis = {
  id: OfficiatingFingerprintDimensionId;
  label: string;
  shortLabel: string;
  percentile: number;
  leagueAveragePercentile: number;
  tooltip: string;
};

export type OfficiatingFingerprintData = {
  officialName: string;
  officialSlug: string;
  leagueId: LeagueId;
  sampleGames: number;
  qualified: boolean;
  axes: OfficiatingFingerprintAxis[];
};

function clampPercentile(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percentileFromDelta(delta: number, scale: number): number {
  return clampPercentile(50 + (delta / scale) * 28);
}

function ordinalPercentile(value: number): string {
  const n = Math.round(value);
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function tooltipLine(
  label: string,
  percentile: number,
  detail: string,
): string {
  return `${label}: ${ordinalPercentile(percentile)} Percentile - ${detail}`;
}

function paceAxis(report: ScoutingReport, profile: RefProfile): OfficiatingFingerprintAxis {
  const delta = profile.totalPointsDelta ?? 0;
  const percentile = percentileFromDelta(delta, 6);
  const direction = delta >= 0 ? "faster" : "slower";
  return {
    id: "pace_acceleration",
    label: "Pace Acceleration",
    shortLabel: "Pace",
    percentile,
    leagueAveragePercentile: 50,
    tooltip: tooltipLine(
      "Pace Acceleration",
      percentile,
      `Games run ${Math.abs(delta).toFixed(1)} ${direction} than league average (${report.baselineWhistlesPerGame.toFixed(1)} whistle baseline).`,
    ),
  };
}

function contactAxis(report: ScoutingReport): OfficiatingFingerprintAxis {
  const toleranceScore = report.styleProfile.gameFlowScore;
  const subjectiveShare = report.styleProfile.subjectiveShare;
  const fewerFouls = ((1 - subjectiveShare) * 8).toFixed(1);
  return {
    id: "contact_tolerance",
    label: "Contact Tolerance",
    shortLabel: "Contact",
    percentile: clampPercentile(toleranceScore),
    leagueAveragePercentile: 50,
    tooltip: tooltipLine(
      "Contact Tolerance",
      toleranceScore,
      `Calls ${fewerFouls} fewer subjective fouls vs league contact baseline.`,
    ),
  };
}

function technicalAxis(report: ScoutingReport): OfficiatingFingerprintAxis {
  const adminRatio = report.officialStats.admin_ratio;
  const percentile = clampPercentile(35 + adminRatio * 45);
  return {
    id: "technical_escalation",
    label: "Technical Escalation",
    shortLabel: "Technical",
    percentile,
    leagueAveragePercentile: 50,
    tooltip: tooltipLine(
      "Technical Escalation",
      percentile,
      `Administrative whistle share ${(adminRatio * 100).toFixed(0)}% vs procedural baseline.`,
    ),
  };
}

function whistleDriftAxis(
  leagueId: LeagueId,
  profile: RefProfile,
): OfficiatingFingerprintAxis {
  const fatigue = computeRefWhistleFatigue(leagueId, profile);
  const driftPct = fatigue?.lateVsEarlyPct ?? 0;
  const percentile = percentileFromDelta(driftPct, 14);
  const periodLabel = fatigue?.latePeriodLabel ?? "late quarters";
  return {
    id: "fourth_quarter_drift",
    label: "4th-Quarter Whistle Drift",
    shortLabel: "Q4 Drift",
    percentile,
    leagueAveragePercentile: 50,
    tooltip: tooltipLine(
      "4th-Quarter Whistle Drift",
      percentile,
      `${formatSignedDrift(driftPct)} whistle volume in ${periodLabel} vs early periods.`,
    ),
  };
}

function formatSignedDrift(value: number): string {
  const rounded = Math.abs(value).toFixed(1);
  if (value > 0) return `+${rounded}%`;
  if (value < 0) return `-${rounded}%`;
  return "0.0%";
}

function homeCourtAxis(profile: RefProfile): OfficiatingFingerprintAxis {
  const cover = profile.homeCoverRate;
  const deltaPp = cover === null ? 0 : (cover - 0.5) * 100;
  const percentile = clampPercentile(50 + deltaPp * 1.4);
  const detail =
    cover === null
      ? "Home cover rate unavailable for this sample."
      : `Home teams cover ${(cover * 100).toFixed(1)}% under this crew (${formatSignedDrift(deltaPp)} vs 50% neutral).`;
  return {
    id: "home_court_disparity",
    label: "Home-Court Disparity",
    shortLabel: "Home Bias",
    percentile,
    leagueAveragePercentile: 50,
    tooltip: tooltipLine("Home-Court Disparity", percentile, detail),
  };
}

function replayAxis(report: ScoutingReport): OfficiatingFingerprintAxis {
  const stoppageRate = report.runStoppageRate ?? report.momentumKillerScore ?? 0;
  const percentile = clampPercentile((stoppageRate ?? 0) * 100);
  return {
    id: "replay_overturn_propensity",
    label: "Replay Overturn Propensity",
    shortLabel: "Replay",
    percentile,
    leagueAveragePercentile: 50,
    tooltip: tooltipLine(
      "Replay Overturn Propensity",
      percentile,
      report.momentumKillerLabel
        ? `${report.momentumKillerLabel} on high-leverage stoppages.`
        : "Replay and review stoppage tendency vs league average.",
    ),
  };
}

function consistencyAxis(report: ScoutingReport): OfficiatingFingerprintAxis {
  const percentile = clampPercentile(report.consistencyScore * 10);
  return {
    id: "consistency_index",
    label: "Consistency Index",
    shortLabel: "Consistency",
    percentile,
    leagueAveragePercentile: 50,
    tooltip: tooltipLine(
      "Consistency Index",
      percentile,
      `Whistle-volume consistency rated ${report.consistencyScore.toFixed(1)}/10 across ${report.sampleGames} games.`,
    ),
  };
}

function starDeferenceAxis(
  leagueId: LeagueId,
  profile: RefProfile,
): OfficiatingFingerprintAxis {
  const analytics = supportsStarDeferenceLeague(leagueId)
    ? computeRefStarDeference(leagueId, profile)
    : null;
  const index = analytics?.star_deference_index ?? 0;
  const percentile = clampPercentile(50 + index * 35);
  return {
    id: "star_deference_rate",
    label: "Star Deference Rate",
    shortLabel: "Star Def.",
    percentile,
    leagueAveragePercentile: 50,
    tooltip: tooltipLine(
      "Star Deference Rate",
      percentile,
      analytics?.star_deference_display ??
        "Star treatment delta unavailable for this league sample.",
    ),
  };
}

export function buildOfficiatingFingerprint(
  leagueId: LeagueId,
  profile: RefProfile,
  stats: RefStatsFile,
  qualified: boolean,
): OfficiatingFingerprintData | null {
  const resolved: ResolvedOfficialProfile = { profile, stats, qualified };
  const report = generateScoutingReport(profile.slug, { leagueId }, resolved);
  if (!report) return null;

  const axes: OfficiatingFingerprintAxis[] = [
    paceAxis(report, profile),
    contactAxis(report),
    technicalAxis(report),
    whistleDriftAxis(leagueId, profile),
    homeCourtAxis(profile),
    replayAxis(report),
    consistencyAxis(report),
    starDeferenceAxis(leagueId, profile),
  ];

  return {
    officialName: profile.name,
    officialSlug: profile.slug,
    leagueId,
    sampleGames: report.sampleGames,
    qualified: report.qualified,
    axes,
  };
}

export function buildCrewOfficiatingFingerprints(
  leagueId: LeagueId,
  crew: Array<{ slug: string; name: string; role?: RefRole }>,
  stats: RefStatsFile,
): Array<{
  slug: string;
  name: string;
  role?: RefRole;
  fingerprint: OfficiatingFingerprintData;
}> {
  const results = [];
  for (const official of crew) {
    const profile = stats.refs.find((ref) => ref.slug === official.slug);
    if (!profile) continue;
    const qualified = profile.games >= stats.meta.minSampleSize;
    const fingerprint = buildOfficiatingFingerprint(
      leagueId,
      profile,
      stats,
      qualified,
    );
    if (!fingerprint) continue;
    results.push({
      slug: official.slug,
      name: official.name,
      role: official.role,
      fingerprint,
    });
  }
  return results;
}
