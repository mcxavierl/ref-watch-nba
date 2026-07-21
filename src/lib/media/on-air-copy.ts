import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildMediaCardContent,
  resolvePrimaryOfficial,
  topEvidenceBullets,
} from "@/lib/media/media-card-content";

export type OnAirCopyFormat = "full" | "whistle-profile" | "evidence-summary";

function bulletLines(bullets: string[]): string[] {
  return bullets.map((bullet) => `• ${bullet}`);
}

export function buildOnAirCopy(
  preview: GameSlatePreviewPayload,
  evidence: ProjectionEvidencePayload,
  format: OnAirCopyFormat = "full",
): string {
  const content = buildMediaCardContent(preview, evidence);
  const bullets = topEvidenceBullets(evidence);
  const metricLabel = evidence.metricLabel ?? preview.whistleLabel;

  const whistleBlock = [
    "THE WHISTLE PROFILE",
    `Matchup: ${preview.matchup}`,
    `League: ${preview.leagueLabel}`,
    `Official: ${resolvePrimaryOfficial(preview)}`,
    `Key stat: ${content.whistleProfile.keyStatHeadline}`,
    content.whistleProfile.keyStatDetail,
  ];

  const evidenceBlock = [
    "EVIDENCE SUMMARY",
    ...bulletLines(
      bullets.length > 0
        ? bullets
        : ["No high-confidence evidence drivers surfaced for this matchup."],
    ),
    `Confidence: ${evidence.confidencePct}%`,
    `Evidence strength: ${evidence.evidenceStrength.toFixed(1)} / 10`,
    `Metric focus: ${metricLabel}`,
  ];

  const disclaimer =
    "Ref Watch broadcast export. Historical officiating tendencies only. Not betting advice.";

  if (format === "whistle-profile") {
    return [...whistleBlock, "", disclaimer].join("\n");
  }

  if (format === "evidence-summary") {
    return [...evidenceBlock, "", disclaimer].join("\n");
  }

  return [
    "REF WATCH | BROADCAST EXPORT",
    "",
    ...whistleBlock,
    "",
    ...evidenceBlock,
    "",
    disclaimer,
  ].join("\n");
}
