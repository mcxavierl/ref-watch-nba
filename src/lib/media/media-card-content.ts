import { generateScoutingReport } from "@/lib/analytics/generate-scouting-report";
import type { EvidenceDriver, EvidenceImpact, ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import { resolveOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { LeagueId } from "@/lib/leagues";
import { slateTeamLogoSport } from "@/lib/slate-team-display";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export const MEDIA_CARD_WIDTH = 1920;
export const MEDIA_CARD_HEIGHT = 1080;

const IMPACT_RANK: Record<EvidenceImpact, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export type MediaCardRefProfile = {
  name: string;
  slug: string;
  sport: ReturnType<typeof slateTeamLogoSport>;
  role?: string;
};

export type MediaCardContent = {
  leagueLabel: string;
  matchupBadge: string;
  heroMetric: string;
  heroMetricTone: "positive" | "negative" | "neutral";
  primaryRef: MediaCardRefProfile;
  crewLabel: string;
  archetypeTag: string;
  evidenceBullets: string[];
  confidencePct: number;
  evidenceStrength: number;
  metricLabel: string;
  sampleGames: number;
};

export function formatMatchupBadge(preview: GameSlatePreviewPayload): string {
  if (preview.awayAbbr && preview.homeAbbr) {
    return `${preview.awayAbbr} @ ${preview.homeAbbr}`;
  }
  return preview.matchup.replace(/\s+at\s+/i, " @ ");
}

export function resolvePrimaryOfficial(preview: GameSlatePreviewPayload): {
  name: string;
  slug: string;
  role?: string;
} {
  const crewChief =
    preview.crew.find((member) => member.role === "crew_chief") ?? preview.crew[0];
  if (!crewChief) {
    return { name: "Crew TBD", slug: "crew-tbd" };
  }
  return {
    name: crewChief.name,
    slug: crewChief.slug,
    role: crewChief.role,
  };
}

export function buildHeroMetric(preview: GameSlatePreviewPayload): {
  headline: string;
  tone: "positive" | "negative" | "neutral";
} {
  const delta = preview.foulsDelta;
  const label = preview.whistleLabel.toUpperCase();

  if (preview.insufficientSample) {
    return {
      headline: `INSUFFICIENT ${label} SAMPLE`,
      tone: "neutral",
    };
  }

  if (Math.abs(delta) < 0.1) {
    return {
      headline: `${label} IN LINE WITH LEAGUE AVERAGE`,
      tone: "neutral",
    };
  }

  const direction = delta > 0 ? "ABOVE" : "BELOW";
  return {
    headline: `${formatSigned(delta)} ${label} ${direction} LEAGUE AVG`,
    tone: delta > 0 ? "positive" : "negative",
  };
}

export function formatCrewLabel(preview: GameSlatePreviewPayload): string {
  if (preview.crew.length === 0) return "Crew assignment pending";
  if (preview.crew.length === 1) return preview.crew[0]!.name;
  return preview.crew.map((member) => member.name).join(" · ");
}

function deriveArchetypeTag(
  leagueId: LeagueId,
  slug: string,
  fallback = "Balanced whistle profile",
): string {
  const resolved = resolveOfficialProfile(slug, leagueId);
  if (!resolved) return fallback;

  const report = generateScoutingReport(slug, { leagueId }, resolved);
  if (!report) return fallback;

  if (report.styleProfile.subjectiveShare >= 0.65) {
    return "High Subjective Contact Sensitivity";
  }
  if (report.styleProfile.administrativeShare >= 0.42) {
    return "High Procedural Enforcement";
  }
  if (report.pressureSensitive) {
    return "Pressure-Sensitive Whistle Profile";
  }
  return report.archetypeDisplayName;
}

export function rankEvidenceDrivers(drivers: EvidenceDriver[]): EvidenceDriver[] {
  return [...drivers].sort((left, right) => {
    const impactDelta = IMPACT_RANK[left.impact] - IMPACT_RANK[right.impact];
    if (impactDelta !== 0) return impactDelta;
    return Math.abs(right.value - right.baseline) - Math.abs(left.value - left.baseline);
  });
}

function broadcastBulletFromDriver(driver: EvidenceDriver): string {
  const detail = driver.detail?.trim();
  if (detail) return detail.endsWith(".") ? detail : `${detail}.`;
  const headline = driver.headline.trim();
  return headline.endsWith(".") ? headline : `${headline}.`;
}

export function buildBroadcastEvidenceBullets(
  preview: GameSlatePreviewPayload,
  evidence: ProjectionEvidencePayload,
  limit = 3,
): string[] {
  const ranked = rankEvidenceDrivers([
    ...evidence.factorsIncreasing,
    ...evidence.factorsReducing,
  ]);
  const driverBullets = ranked
    .slice(0, limit)
    .map((driver) => broadcastBulletFromDriver(driver));

  if (driverBullets.length >= limit) return driverBullets;

  const extras: string[] = [];

  if (!preview.insufficientSample && Math.abs(preview.foulsDelta) >= 0.5) {
    extras.push(
      `Crew averages ${formatSigned(preview.foulsDelta)} more ${preview.whistleLabel.toLowerCase()} called per game than league baseline.`,
    );
  }

  if (preview.avgTotalPoints > 0 && Math.abs(preview.totalPointsDelta) >= 2) {
    extras.push(
      `Historical crew combination averages ${preview.avgTotalPoints.toFixed(1)} ${preview.scoringLabel.toLowerCase()} in this matchup context (${formatSigned(preview.totalPointsDelta)} vs league).`,
    );
  }

  for (const story of preview.storylines) {
    const text = story.summary?.trim()
      ? `${story.headline}. ${story.summary.trim()}`
      : story.headline;
    extras.push(text.endsWith(".") ? text : `${text}.`);
  }

  const merged = [...driverBullets];
  for (const bullet of extras) {
    if (merged.length >= limit) break;
    if (!merged.includes(bullet)) merged.push(bullet);
  }

  if (merged.length === 0) {
    return [
      "Crew and matchup intelligence updates as assignments publish.",
      "Sample-gated officiating tendencies only. Not betting advice.",
      "Ref Watch historical model uses multi-season crew analytics.",
    ].slice(0, limit);
  }

  return merged.slice(0, limit);
}

export function buildMediaCardContent(
  preview: GameSlatePreviewPayload,
  evidence: ProjectionEvidencePayload,
): MediaCardContent {
  const primary = resolvePrimaryOfficial(preview);
  const hero = buildHeroMetric(preview);
  const metricLabel = evidence.metricLabel ?? preview.whistleLabel;

  return {
    leagueLabel: preview.leagueLabel,
    matchupBadge: formatMatchupBadge(preview),
    heroMetric: hero.headline,
    heroMetricTone: hero.tone,
    primaryRef: {
      name: primary.name,
      slug: primary.slug,
      sport: slateTeamLogoSport(preview.leagueId),
      role: primary.role,
    },
    crewLabel: formatCrewLabel(preview),
    archetypeTag: deriveArchetypeTag(preview.leagueId, primary.slug),
    evidenceBullets: buildBroadcastEvidenceBullets(preview, evidence),
    confidencePct: evidence.confidencePct,
    evidenceStrength: evidence.evidenceStrength,
    metricLabel,
    sampleGames: preview.sampleGames,
  };
}

export function buildRefMediaCardContent(
  leagueId: LeagueId,
  profile: RefProfile,
  stats: RefStatsFile,
  qualified: boolean,
): MediaCardContent {
  const resolved = { profile, stats, qualified };
  const report = generateScoutingReport(profile.slug, { leagueId }, resolved);
  const leagueAvgFouls = stats.meta.leagueAvgFouls ?? 0;
  const foulsDelta = profile.avgFouls - leagueAvgFouls;
  const hero = buildHeroMetric({
    gameId: profile.slug,
    leagueId: leagueId as GameSlatePreviewPayload["leagueId"],
    leagueLabel: leagueId.toUpperCase(),
    sport: leagueId as GameSlatePreviewPayload["sport"],
    basePath: `/${leagueId}`,
    matchup: profile.name,
    awayTeam: "",
    homeTeam: "",
    ouLean: "neutral",
    insufficientSample: !qualified,
    sampleGames: profile.games,
    scoringLabel: "Points",
    whistleLabel: "Fouls",
    avgTotalPoints: profile.avgTotalPoints,
    totalPointsDelta: 0,
    overRate: profile.overRate,
    avgFouls: profile.avgFouls,
    foulsDelta,
    crew: [{ name: profile.name, number: profile.number, slug: profile.slug }],
    refTeamRows: [],
    teamImpacts: [],
    storylines: [],
  });

  const evidenceBullets =
    report && report.insights.length > 0
      ? report.insights.slice(0, 3).map((insight) =>
          insight.endsWith(".") ? insight : `${insight}.`,
        )
      : [
          `${profile.name} profiles with ${formatPct(profile.overRate)} over rate across ${profile.games} officiated games.`,
          report
            ? `${report.styleProfile.label} across the last ${report.sampleWindow} games.`
            : "Sample-gated officiating tendencies from Ref Watch historical model.",
        ];

  return {
    leagueLabel: leagueId.toUpperCase(),
    matchupBadge: `${leagueId.toUpperCase()} · #${profile.number}`,
    heroMetric: hero.headline,
    heroMetricTone: hero.tone,
    primaryRef: {
      name: profile.name,
      slug: profile.slug,
      sport: slateTeamLogoSport(leagueId),
    },
    crewLabel: profile.name,
    archetypeTag: report
      ? report.styleProfile.subjectiveShare >= 0.65
        ? "High Subjective Contact Sensitivity"
        : report.archetypeDisplayName
      : "Officiating intelligence profile",
    evidenceBullets,
    confidencePct: report ? Math.min(99, Math.round(report.consistencyScore * 10)) : 75,
    evidenceStrength: report?.consistencyScore ?? 7,
    metricLabel: "Fouls",
    sampleGames: profile.games,
  };
}

/** @deprecated Use buildBroadcastEvidenceBullets */
export function topEvidenceBullets(
  evidence: ProjectionEvidencePayload,
  limit = 3,
): string[] {
  const ranked = rankEvidenceDrivers([
    ...evidence.factorsIncreasing,
    ...evidence.factorsReducing,
  ]);
  return ranked.slice(0, limit).map((driver) => broadcastBulletFromDriver(driver));
}

/** @deprecated Use buildHeroMetric */
export function buildKeyStatHeadline(preview: GameSlatePreviewPayload): string {
  return buildHeroMetric(preview).headline;
}
