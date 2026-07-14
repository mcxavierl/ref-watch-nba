import type { ConfidenceTier } from "@/lib/user-language";

/** Shown when a stat or label has no value (no em dash). */
export const EMPTY_DISPLAY = "-";

export const NEUTRAL_RATE_MIN = 0.49;
export const NEUTRAL_RATE_MAX = 0.51;

/** Headline words that must not appear when delta is negative. */
export const BANNED_NEGATIVE_DELTA_HEADLINE =
  /\b(heaviest|highest|most|heavier|heaviest|max|peak)\b/i;

export function isNeutralRate(rate: number): boolean {
  return rate >= NEUTRAL_RATE_MIN && rate <= NEUTRAL_RATE_MAX;
}

export function formatSeasonSpan(seasons: string[]): string {
  if (seasons.length === 0) return EMPTY_DISPLAY;
  const startYear = Number.parseInt(seasons[0].slice(0, 4), 10);
  const last = seasons[seasons.length - 1];
  const match = last.match(/^(\d{4})-(\d{2})$/);
  const endYear = match
    ? Number.parseInt(match[1], 10) + 1
    : Number.parseInt(last.slice(0, 4), 10);
  return `${startYear}–${endYear}`;
}

export function formatFindingSampleMeta(
  games: number,
  seasons: string[],
): string {
  const seasonCount = seasons.length;
  const span = formatSeasonSpan(seasons);
  return `Sample: ${games.toLocaleString()} games over ${seasonCount} season${seasonCount === 1 ? "" : "s"} (${span})`;
}

function neutralOutcomePhrase(subject: string): string {
  const phrases = [
    `${subject} balances perfectly neutral`,
    `${subject} sits on the benchmark`,
    `${subject} maintains standard pacing`,
  ] as const;
  return phrases[subject.length % phrases.length]!;
}

export function overUnderFrequencyHeadline(
  refName: string,
  overRate: number,
  direction: "high" | "low",
): string {
  if (isNeutralRate(overRate)) {
    return neutralOutcomePhrase(refName);
  }
  const lean = direction === "high" ? "over" : "under";
  return `${refName} leads the pool on ${lean} frequency`;
}

/** Stat row label that matches over/under direction; never "Over benchmark" when rate is under 50%. */
export function overBenchmarkStatLabel(rate: number): string {
  if (isNeutralRate(rate)) return "At benchmark";
  return rate >= 0.5 ? "Over benchmark" : "Under benchmark";
}

function formatDeltaMagnitude(delta: number): string {
  return Math.abs(delta).toFixed(1);
}

/**
 * Headline from signed delta vs league average.
 * Negative deltas use fewer/below/under, never heaviest/highest.
 */
export function deltaVsLeagueHeadline(
  subject: string,
  delta: number,
  unit: string,
): string {
  const magnitude = formatDeltaMagnitude(delta);
  if (delta > 0) {
    return `${subject} runs ${magnitude} more ${unit} than league average`;
  }
  if (delta < 0) {
    return `${subject} runs ${magnitude} fewer ${unit} than league average`;
  }
  return `${subject} matches league average ${unit} pace`;
}

export function minorsPaceHeadline(refName: string, minorsDelta: number): string {
  return deltaVsLeagueHeadline(refName, minorsDelta, "minors");
}

export function whistlePaceHeadline(
  refName: string,
  foulsDelta: number,
  whistleUnit: string,
  overRate: number,
): string {
  const paceHeadline = deltaVsLeagueHeadline(refName, foulsDelta, whistleUnit);

  if (isNeutralRate(overRate)) {
    if (foulsDelta > 0) {
      return `${refName} calls a heavy ${whistleUnit} pace, yet overall scoring tracks dead-neutral`;
    }
    if (foulsDelta < 0) {
      return `${refName} calls a light ${whistleUnit} pace, yet overall scoring tracks dead-neutral`;
    }
    return `${refName} matches league ${whistleUnit} pace with dead-neutral scoring`;
  }

  return paceHeadline;
}

export function whistleParadoxHeadline(refName: string, overRate: number): string {
  if (isNeutralRate(overRate)) {
    return `${refName} calls high foul pace, yet overall scoring tracks dead-neutral`;
  }
  if (overRate > NEUTRAL_RATE_MAX) {
    return `${refName} whistles heavy, yet scoring still trends over the benchmark`;
  }
  return `${refName} whistles heavy, scores stay low`;
}

export function teamCrewOverHeadline(
  teamName: string,
  overRate: number,
  deltaFromNeutral: number,
): string {
  if (isNeutralRate(overRate)) {
    return `${teamName} sits on the benchmark with this crew`;
  }
  const lean = overRate >= 0.5 ? "over" : "under";
  return `${teamName} runs ${lean} ${(deltaFromNeutral * 100).toFixed(0)} pts off neutral with this crew`;
}

export function teamCrewLeanHeadline(
  teamName: string,
  overRate: number,
  deltaFromNeutral: number,
): string {
  if (isNeutralRate(overRate)) {
    return `${teamName} sits on the benchmark with this crew`;
  }
  const lean = overRate >= 0.5 ? "over" : "under";
  return `${teamName} ${lean}s with this crew ${(deltaFromNeutral * 100).toFixed(0)} pts off neutral`;
}

export function ouLeanHeadline(
  refName: string,
  rate: number,
  totalsLabel: string,
): string {
  if (isNeutralRate(rate)) {
    return `${refName} maintains standard pacing vs closing ${totalsLabel}`;
  }
  const lean = rate >= 0.5 ? "overs" : "unders";
  return `${refName} leans ${lean} vs closing ${totalsLabel}`;
}

export function ouAtsHistoricalHeadline(
  refName: string,
  rate: number,
  lean: "overs" | "unders",
): string {
  if (isNeutralRate(rate)) {
    return `${refName} maintains standard pacing vs closing totals`;
  }
  return `${refName}: highest historical ${lean} rate vs closing totals`;
}

export function closeGameLeanHeadline(
  closeOverRate: number,
  benchmark: number | string,
  scoreUnit: string,
): string {
  if (isNeutralRate(closeOverRate)) {
    return `Competitive games sit on the ${benchmark}-${scoreUnit} benchmark`;
  }
  const lean = closeOverRate >= 0.5 ? "over" : "under";
  return `Competitive games lean ${lean} the ${benchmark}-${scoreUnit} benchmark`;
}

const CONFIDENCE_DISPLAY: Record<ConfidenceTier, string> = {
  Strong: "High",
  Moderate: "Moderate",
  Thin: "Low",
};

/** Compact card metadata: sample size + confidence tier. */
export function formatFindingCardMeta(
  sampleNote: string,
  tier: ConfidenceTier,
): string {
  const gamesMatch = sampleNote.match(/Sample:\s*([\d,]+)\s*games?/i);
  const games = gamesMatch?.[1] ?? EMPTY_DISPLAY;
  return `Sample: ${games} games • Confidence: ${CONFIDENCE_DISPLAY[tier]}`;
}
