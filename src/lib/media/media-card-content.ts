import type { EvidenceDriver, EvidenceImpact, ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { formatSigned } from "@/lib/stats-utils";

export const MEDIA_CARD_WIDTH = 1920;
export const MEDIA_CARD_HEIGHT = 1080;

const IMPACT_RANK: Record<EvidenceImpact, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export type WhistleProfileContent = {
  officialName: string;
  matchup: string;
  leagueLabel: string;
  keyStatHeadline: string;
  keyStatDetail: string;
  sampleGames: number;
};

export type EvidenceSummaryContent = {
  bullets: string[];
  confidencePct: number;
  evidenceStrength: number;
  metricLabel: string;
};

export type MediaCardContent = {
  whistleProfile: WhistleProfileContent;
  evidenceSummary: EvidenceSummaryContent;
};

export function resolvePrimaryOfficial(preview: GameSlatePreviewPayload): string {
  if (preview.crew.length > 0) return preview.crew[0]!.name;
  return "Crew TBD";
}

export function buildKeyStatHeadline(preview: GameSlatePreviewPayload): string {
  const delta = preview.foulsDelta;
  const label = preview.whistleLabel;
  if (preview.insufficientSample) {
    return `Insufficient ${label.toLowerCase()} sample`;
  }
  if (Math.abs(delta) < 0.1) {
    return `${label} in line with league average`;
  }
  const direction = delta > 0 ? "Above" : "Below";
  return `${formatSigned(delta)} ${label} ${direction} League Avg`;
}

export function rankEvidenceDrivers(drivers: EvidenceDriver[]): EvidenceDriver[] {
  return [...drivers].sort((left, right) => {
    const impactDelta = IMPACT_RANK[left.impact] - IMPACT_RANK[right.impact];
    if (impactDelta !== 0) return impactDelta;
    return Math.abs(right.value - right.baseline) - Math.abs(left.value - left.baseline);
  });
}

export function topEvidenceBullets(
  evidence: ProjectionEvidencePayload,
  limit = 3,
): string[] {
  const ranked = rankEvidenceDrivers([
    ...evidence.factorsIncreasing,
    ...evidence.factorsReducing,
  ]);
  return ranked.slice(0, limit).map((driver) => driver.headline);
}

export function buildMediaCardContent(
  preview: GameSlatePreviewPayload,
  evidence: ProjectionEvidencePayload,
): MediaCardContent {
  const bullets = topEvidenceBullets(evidence);
  const metricLabel = evidence.metricLabel ?? preview.whistleLabel;

  return {
    whistleProfile: {
      officialName: resolvePrimaryOfficial(preview),
      matchup: preview.matchup,
      leagueLabel: preview.leagueLabel,
      keyStatHeadline: buildKeyStatHeadline(preview),
      keyStatDetail: preview.insufficientSample
        ? "Sample size below broadcast threshold."
        : `${preview.sampleGames} games in crew sample · ${preview.avgFouls} avg ${metricLabel.toLowerCase()}`,
      sampleGames: preview.sampleGames,
    },
    evidenceSummary: {
      bullets:
        bullets.length > 0
          ? bullets
          : ["No high-confidence evidence drivers surfaced for this matchup."],
      confidencePct: evidence.confidencePct,
      evidenceStrength: evidence.evidenceStrength,
      metricLabel,
    },
  };
}
