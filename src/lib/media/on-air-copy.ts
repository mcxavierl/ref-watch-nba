import {
  formatCrewRole,
  type MediaCardContent,
  type ProducerCopySections,
} from "@/lib/media/media-card-types";

export type OnAirCopyFormat = "full" | "storyline" | "evidence-summary";

function heroMetricForSpeech(heroMetric: string): string {
  return heroMetric
    .replace(/LEAGUE AVG/i, "league average")
    .replace(/ABOVE/i, "above")
    .replace(/BELOW/i, "below")
    .toLowerCase();
}

function bulletLines(bullets: string[]): string[] {
  return bullets.map((bullet) => `• ${bullet}`);
}

function buildLowerThirdCopy(content: MediaCardContent): string {
  const role = formatCrewRole(content.primaryRef.role);
  const officialLabel = role
    ? `${content.primaryRef.name} (${role})`
    : content.primaryRef.name;

  return [
    `${content.heroMetric} | ${officialLabel}`,
    `• ${content.matchupBadge} · ${content.leagueLabel}`,
    `• ${content.archetypeTag}`,
  ].join("\n");
}

function buildTeleprompterScript(
  content: MediaCardContent,
  crewNames: string,
): string {
  const heroSpeech = heroMetricForSpeech(content.heroMetric);
  const archetype = content.archetypeTag.toLowerCase();

  return [
    `Tonight's ${content.leagueLabel} crew of ${crewNames} projects ${heroSpeech}, with ${content.sampleGames} sample games in the Ref Watch model window.`,
    `Watch for ${archetype} in drive and contact sequences, backed by ${content.confidencePct}% confidence and ${content.evidenceStrength.toFixed(1)} out of 10 evidence strength.`,
  ].join(" ");
}

function buildProducerBulletCopy(content: MediaCardContent): string {
  const lines = [
    ...bulletLines(content.evidenceBullets),
    `• ${content.metricLabel} sample: ${content.sampleGames} games in the model window.`,
    `• Confidence ${content.confidencePct}% · Evidence strength ${content.evidenceStrength.toFixed(1)} / 10.`,
    "• Sample-gated officiating tendencies only. Not betting advice.",
  ];

  return lines.join("\n");
}

export function formatAllProducerNotes(
  sections: Omit<ProducerCopySections, "all">,
): string {
  return [
    "LOWER-THIRD / BANNER TEXT",
    sections.lowerThird,
    "",
    "TELEPROMPTER / COMMENTARY SCRIPT",
    sections.teleprompter,
    "",
    "PRODUCER BULLET POINTS / STAT BREAKDOWN",
    sections.producerBullets,
  ].join("\n");
}

export function buildProducerCopyFromContent(
  content: MediaCardContent,
  crewNames: string,
): ProducerCopySections {
  const lowerThird = buildLowerThirdCopy(content);
  const teleprompter = buildTeleprompterScript(content, crewNames);
  const producerBullets = buildProducerBulletCopy(content);

  return {
    lowerThird,
    teleprompter,
    producerBullets,
    all: formatAllProducerNotes({ lowerThird, teleprompter, producerBullets }),
  };
}

function teleprompterFromContent(content: MediaCardContent, crewNames: string): string {
  const heroSpeech = heroMetricForSpeech(content.heroMetric);

  return [
    `ON-AIR STORYLINE: Tonight's crew of ${crewNames} projects ${heroSpeech}. Ref Watch data highlights ${content.archetypeTag.toLowerCase()} in paint drive scenarios.`,
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
    return buildTeleprompterScript(content, crewNames);
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
