import { generateScoutingReport } from "@/lib/analytics/generate-scouting-report";
import type { ResolvedOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import type { ScoutingReport } from "@/lib/analytics/scouting-report-types";
import type { LeagueId } from "@/lib/leagues";
import { populationStdDev } from "@/lib/metric-significance";
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
    label: "Contact Sensitivity",
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
    label: "Whistle Consistency",
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

export type OfficiatingFingerprintTooltip = {
  label: string;
  description: string;
  subtext: string;
};

export type OfficiatingFingerprintAxis = {
  id: OfficiatingFingerprintDimensionId;
  label: string;
  shortLabel: string;
  percentile: number;
  leagueAveragePercentile: number;
  tooltip: OfficiatingFingerprintTooltip;
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

function formatSigned(value: number, digits = 1): string {
  const rounded = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${rounded}`;
  if (value < 0) return `-${rounded}`;
  return digits === 0 ? "0" : `0.${"0".repeat(digits)}`;
}

function formatSignedDrift(value: number): string {
  const rounded = Math.abs(value).toFixed(1);
  if (value > 0) return `+${rounded}%`;
  if (value < 0) return `-${rounded}%`;
  return "0.0%";
}

function percentileSubtext(percentile: number, metric: string): string {
  return `${ordinalPercentile(percentile)} Percentile • ${metric}`;
}

function buildTooltip(
  label: string,
  description: string,
  subtext: string,
): OfficiatingFingerprintTooltip {
  return { label, description, subtext };
}

function resolveHomeCoverRate(profile: RefProfile): number | null {
  if (profile.homeCoverRate !== null) return profile.homeCoverRate;
  const betting = profile.bettingStats;
  if (!betting?.linesAvailable) return null;
  const { wins, losses, pushes } = betting.homeTeamAts;
  const decisions = wins + losses + pushes;
  if (decisions === 0) return null;
  return wins / decisions;
}

function leagueAvgHomeFoulDelta(stats: RefStatsFile): number {
  const conferenceBaselines = stats.meta.conferenceBaselines;
  if (conferenceBaselines) {
    let weightedSum = 0;
    let weightedGames = 0;
    for (const baseline of Object.values(conferenceBaselines)) {
      if (baseline.games <= 0) continue;
      weightedSum +=
        (baseline.avgHomeFouls - baseline.avgAwayFouls) * baseline.games;
      weightedGames += baseline.games;
    }
    if (weightedGames > 0) return weightedSum / weightedGames;
  }

  let homeFoulSum = 0;
  let homeFoulGames = 0;
  for (const splits of Object.values(stats.teamSplits)) {
    for (const split of splits) {
      if (split.homeGames <= 0) continue;
      homeFoulSum += split.foulDifferential * split.homeGames;
      homeFoulGames += split.homeGames;
    }
  }
  return homeFoulGames > 0 ? homeFoulSum / homeFoulGames : 0;
}

function refHomeFoulDelta(profile: RefProfile, stats: RefStatsFile): number | null {
  const refKey = profile.slug;
  let homeFoulSum = 0;
  let homeFoulGames = 0;

  for (const splits of Object.values(stats.teamSplits)) {
    const split = splits.find((entry) => entry.crewKey === refKey);
    if (!split || split.homeGames <= 0) continue;
    homeFoulSum += split.foulDifferential * split.homeGames;
    homeFoulGames += split.homeGames;
  }

  if (homeFoulGames <= 0) return null;

  const refHomeEdge = homeFoulSum / homeFoulGames;
  return refHomeEdge - leagueAvgHomeFoulDelta(stats);
}

function homeWhistleBiasSubtext(percentile: number, delta: number): string {
  return percentileSubtext(
    percentile,
    `${formatSigned(delta)} home whistle bias vs baseline`,
  );
}

function whistleStdDev(profile: RefProfile): number {
  const whistles = (profile.recentGames ?? []).map((game) => game.totalFouls);
  if (whistles.length < 2) return 0;
  return populationStdDev(whistles);
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
    tooltip: buildTooltip(
      "Pace Acceleration",
      "Measures scoring tempo relative to league average total points.",
      percentileSubtext(
        percentile,
        `Games run ${Math.abs(delta).toFixed(1)} ${direction} than league average (${report.baselineWhistlesPerGame.toFixed(1)} whistle baseline).`,
      ),
    ),
  };
}

function contactAxis(report: ScoutingReport): OfficiatingFingerprintAxis {
  const toleranceScore = report.styleProfile.gameFlowScore;
  const subjectiveShare = report.styleProfile.subjectiveShare;
  const fewerFouls = ((1 - subjectiveShare) * 8).toFixed(1);
  return {
    id: "contact_tolerance",
    label: "Contact Sensitivity",
    shortLabel: "Contact",
    percentile: clampPercentile(toleranceScore),
    leagueAveragePercentile: 50,
    tooltip: buildTooltip(
      "Contact Sensitivity",
      "Measures overall whistle frequency per possession. High values represent tight officiating environments.",
      percentileSubtext(
        toleranceScore,
        `Calls ${fewerFouls} fewer subjective fouls vs league contact baseline.`,
      ),
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
    tooltip: buildTooltip(
      "Technical Escalation",
      "Tracks administrative whistle share versus procedural foul calls.",
      percentileSubtext(
        percentile,
        `Administrative whistle share ${(adminRatio * 100).toFixed(0)}% vs procedural baseline.`,
      ),
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
    tooltip: buildTooltip(
      "4th-Quarter Whistle Drift",
      "Compares late-period whistle volume against early-game enforcement.",
      percentileSubtext(
        percentile,
        `${formatSignedDrift(driftPct)} whistle volume in ${periodLabel} vs early periods.`,
      ),
    ),
  };
}

function homeCourtAxis(
  profile: RefProfile,
  stats: RefStatsFile,
): OfficiatingFingerprintAxis {
  const cover = resolveHomeCoverRate(profile);
  let delta = 0;
  let percentile = 50;

  if (cover !== null) {
    delta = (cover - 0.5) * 100;
    percentile = clampPercentile(50 + delta * 1.4);
  } else {
    const homeFoulDelta = refHomeFoulDelta(profile, stats);
    if (homeFoulDelta !== null) {
      delta = homeFoulDelta;
      percentile = percentileFromDelta(homeFoulDelta, 2.5);
    }
  }

  return {
    id: "home_court_disparity",
    label: "Home-Court Disparity",
    shortLabel: "Home Bias",
    percentile,
    leagueAveragePercentile: 50,
    tooltip: buildTooltip(
      "Home-Court Disparity",
      "Measures whistle and margin bias toward home teams relative to league baseline.",
      homeWhistleBiasSubtext(percentile, delta),
    ),
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
    tooltip: buildTooltip(
      "Replay Overturn Propensity",
      "Estimates replay and review stoppage tendency on high-leverage sequences.",
      percentileSubtext(
        percentile,
        report.momentumKillerLabel
          ? `${report.momentumKillerLabel} on high-leverage stoppages.`
          : "Replay stoppage tendency vs league average.",
      ),
    ),
  };
}

function consistencyAxis(
  report: ScoutingReport,
  profile: RefProfile,
): OfficiatingFingerprintAxis {
  const percentile = clampPercentile(report.consistencyScore * 10);
  const stdDev = whistleStdDev(profile);
  return {
    id: "consistency_index",
    label: "Whistle Consistency",
    shortLabel: "Consistency",
    percentile,
    leagueAveragePercentile: 50,
    tooltip: buildTooltip(
      "Whistle Consistency",
      "Measures game-to-game call volume variance. High consistency indicates predictable enforcement; low consistency flags high volatility across matchups.",
      percentileSubtext(
        percentile,
        `Game Variance: ±${stdDev.toFixed(1)} whistles`,
      ),
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
    tooltip: buildTooltip(
      "Star Deference Rate",
      "Compares star-player whistle treatment against league personnel baselines.",
      percentileSubtext(
        percentile,
        analytics?.star_deference_display ??
          "Star treatment delta at league-neutral baseline.",
      ),
    ),
  };
}

export function formatOfficiatingFingerprintTooltipAria(
  tooltip: OfficiatingFingerprintTooltip,
): string {
  return `${tooltip.label}. ${tooltip.description} ${tooltip.subtext}`;
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
    homeCourtAxis(profile, stats),
    replayAxis(report),
    consistencyAxis(report, profile),
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
