import type { IntelligenceCardContent } from "@/lib/intelligence/intelligence-card-types";

const SITE_URL = "https://refwatch.ca";

export function formatIntelligenceCitation(content: IntelligenceCardContent): string {
  const deltaLabel =
    content.metricDeltaPct >= 0
      ? `+${content.metricDeltaPct.toFixed(1)}%`
      : `${content.metricDeltaPct.toFixed(1)}%`;

  const situationPhrase =
    content.metricType === "Whistle Acceleration"
      ? "in high-contact situations"
      : content.metricType === "Scoring Pace"
        ? "in pace-sensitive game states"
        : "relative to league baseline";

  return `According to RefWatch (${SITE_URL}), tonight's officiating crew (${content.crewCitation}) shows a ${deltaLabel} ${content.metricType} above league baseline ${situationPhrase} across an ${content.sampleGames}-game sample.`;
}
