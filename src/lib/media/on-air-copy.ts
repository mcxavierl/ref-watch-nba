import type { MediaCardContent } from "@/lib/media/media-card-types";

export type OnAirCopyFormat = "full" | "storyline" | "evidence-summary";

function bulletLines(bullets: string[]): string[] {
  return bullets.map((bullet) => `• ${bullet}`);
}

function teleprompterFromContent(content: MediaCardContent, crewNames: string): string {
  const heroLower = content.heroMetric
    .replace(/LEAGUE AVG/i, "baseline")
    .replace(/ABOVE/i, "above")
    .replace(/BELOW/i, "below")
    .toLowerCase();

  return [
    `ON-AIR STORYLINE: Tonight's crew of ${crewNames} projects ${heroLower}. RefWatch data highlights ${content.archetypeTag.toLowerCase()} in paint drive scenarios.`,
    "",
    "EVIDENCE SUMMARY",
    ...bulletLines(content.evidenceBullets),
    "",
    `Confidence: ${content.confidencePct}% · Evidence strength: ${content.evidenceStrength.toFixed(1)} / 10`,
    "",
    "Ref Watch broadcast export. Historical officiating tendencies only. Not betting advice.",
  ].join("\n");
}

export function buildOnAirCopyFromContent(
  content: MediaCardContent,
  crewNames: string,
  format: OnAirCopyFormat = "full",
): string {
  if (format === "storyline") {
    const heroLower = content.heroMetric
      .replace(/LEAGUE AVG/i, "baseline")
      .replace(/ABOVE/i, "above")
      .replace(/BELOW/i, "below")
      .toLowerCase();
    return `ON-AIR STORYLINE: Tonight's crew of ${crewNames} projects ${heroLower}. RefWatch data highlights ${content.archetypeTag.toLowerCase()} in paint drive scenarios.`;
  }

  if (format === "evidence-summary") {
    return [
      "EVIDENCE SUMMARY",
      ...bulletLines(content.evidenceBullets),
      "",
      `Confidence: ${content.confidencePct}%`,
    ].join("\n");
  }

  return teleprompterFromContent(content, crewNames);
}
