import { SAMPLE_SIZE_THRESHOLD } from "@/lib/analytics/sample-size";

export type EvidenceImpact = "HIGH" | "MEDIUM" | "LOW";
export type EvidenceDirection = "INCREASE" | "DECREASE";
export type ModelContributionFactor =
  | "Crew"
  | "Teams"
  | "Historical Matchups"
  | "Rest/Travel"
  | "Venue";

export interface EvidenceDriver {
  feature: string;
  impact: EvidenceImpact;
  direction: EvidenceDirection;
  headline: string;
  detail: string;
  value: number;
  baseline: number;
  /** Optional tooltip copy for UI hover explanations. */
  tooltip?: string;
}

export interface ModelContribution {
  factor: ModelContributionFactor;
  percentage: number;
}

export interface ProjectionEvidencePayload {
  projection: number;
  confidencePct: number;
  evidenceStrength: number;
  modelContribution: ModelContribution[];
  factorsIncreasing: EvidenceDriver[];
  factorsReducing: EvidenceDriver[];
  /** Whistle unit label for display (e.g. Fouls, Flags). */
  metricLabel?: string;
}

export type EvidenceStrengthInput = {
  sampleGames: number;
  minSampleGames?: number;
  factorsIncreasing: EvidenceDriver[];
  factorsReducing: EvidenceDriver[];
  projectionDirection?: EvidenceDirection;
  completenessRatio?: number;
  valueSigma?: number;
};

export type ConfidencePctInput = {
  evidenceStrength: number;
  sampleGames: number;
  clusterAccuracyPct?: number;
  clusterSampleGames?: number;
};

const BANNED_OBSERVATIONAL_TERMS = [
  /\bwhistle[- ]?happy\b/i,
  /\bstrict\b/i,
  /\bbias(?:ed)?\b/i,
  /\bref(?:eree)? causes fouls\b/i,
  /\bcauses fouls\b/i,
  /\bfavors?\b/i,
  /\bunfair\b/i,
  /\blenient\b/i,
  /\bhostile\b/i,
];

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function roundPct(value: number): number {
  return Math.round(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function containsSubjectiveLanguage(text: string): boolean {
  return BANNED_OBSERVATIONAL_TERMS.some((pattern) => pattern.test(text));
}

export function sanitizeObservationalCopy(text: string): string {
  let sanitized = text.trim();
  for (const pattern of BANNED_OBSERVATIONAL_TERMS) {
    sanitized = sanitized.replace(pattern, "").trim();
  }
  return sanitized.replace(/\s{2,}/g, " ");
}

export function assertObservationalCopy(text: string, field: string): void {
  if (containsSubjectiveLanguage(text)) {
    throw new Error(`Observational copy violation in ${field}: ${text}`);
  }
}

export function buildCrewBaselineHeadline(
  delta: number,
  sampleGames: number,
  metricLabel: string,
  leagueBaseline: number,
): string {
  const headline = `Crew averaged ${delta >= 0 ? "+" : ""}${round1(delta)} ${metricLabel.toLowerCase()} vs league baseline (${round1(leagueBaseline)}) over last ${sampleGames} games`;
  assertObservationalCopy(headline, "crew baseline headline");
  return headline;
}

export function buildTeamRankHeadline(
  teamAbbr: string,
  rank: number,
  metricLabel: string,
  rate: number,
): string {
  const headline = `${teamAbbr} ranks ${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"} in ${metricLabel.toLowerCase()} rate (${round1(rate)} per game)`;
  assertObservationalCopy(headline, "team rank headline");
  return headline;
}

export function classifyEvidenceImpact(
  delta: number,
  baseline: number,
): EvidenceImpact {
  if (!Number.isFinite(delta) || !Number.isFinite(baseline) || baseline === 0) {
    return Math.abs(delta) >= 2 ? "HIGH" : Math.abs(delta) >= 1 ? "MEDIUM" : "LOW";
  }
  const pct = Math.abs(delta / baseline) * 100;
  if (pct >= 12 || Math.abs(delta) >= 2.5) return "HIGH";
  if (pct >= 6 || Math.abs(delta) >= 1.2) return "MEDIUM";
  return "LOW";
}

function featureAgreementScore(
  increasing: EvidenceDriver[],
  reducing: EvidenceDriver[],
  projectionDirection: EvidenceDirection,
): number {
  const aligned =
    projectionDirection === "INCREASE" ? increasing.length : reducing.length;
  const opposing =
    projectionDirection === "INCREASE" ? reducing.length : increasing.length;
  const total = aligned + opposing;
  if (total === 0) return 0.5;
  return aligned / total;
}

function variancePenalty(sigma: number | undefined): number {
  if (sigma === undefined || !Number.isFinite(sigma)) return 0;
  if (sigma <= 0.8) return 0;
  if (sigma <= 1.5) return 0.4;
  if (sigma <= 2.5) return 0.8;
  return 1.2;
}

export function calculateEvidenceStrength(input: EvidenceStrengthInput): number {
  const minSample = input.minSampleGames ?? SAMPLE_SIZE_THRESHOLD;
  const sampleFactor = clamp(input.sampleGames / minSample, 0, 1) * 4;
  const agreement = featureAgreementScore(
    input.factorsIncreasing,
    input.factorsReducing,
    input.projectionDirection ?? "INCREASE",
  );
  const agreementFactor = agreement * 3;
  const completeness = clamp(input.completenessRatio ?? 0.75, 0, 1) * 2;
  const penalty = variancePenalty(input.valueSigma);
  const driverBonus =
    input.factorsIncreasing.length + input.factorsReducing.length >= 3 ? 0.6 : 0.2;

  return round1(
    clamp(sampleFactor + agreementFactor + completeness + driverBonus - penalty, 0, 10),
  );
}

export function calculateConfidencePct(input: ConfidencePctInput): number {
  const clusterAccuracy = input.clusterAccuracyPct ?? 54;
  const clusterWeight = clamp((input.clusterSampleGames ?? input.sampleGames) / 40, 0.35, 1);
  const strengthWeight = input.evidenceStrength / 10;
  const sampleWeight = clamp(input.sampleGames / SAMPLE_SIZE_THRESHOLD, 0, 1);

  const blended =
    clusterAccuracy * 0.55 +
    strengthWeight * 100 * 0.25 +
    sampleWeight * 100 * 0.2;

  return roundPct(clamp(blended * clusterWeight, 35, 92));
}

export function normalizeModelContributions(
  contributions: ModelContribution[],
): ModelContribution[] {
  const total = contributions.reduce((sum, row) => sum + row.percentage, 0);
  if (total <= 0) return contributions;
  const normalized = contributions.map((row) => ({
    ...row,
    percentage: roundPct((row.percentage / total) * 100),
  }));
  const roundedTotal = normalized.reduce((sum, row) => sum + row.percentage, 0);
  if (roundedTotal === 100 || normalized.length === 0) return normalized;
  const adjustIndex = normalized.reduce(
    (best, row, index, list) =>
      row.percentage > list[best].percentage ? index : best,
    0,
  );
  normalized[adjustIndex] = {
    ...normalized[adjustIndex],
    percentage: normalized[adjustIndex].percentage + (100 - roundedTotal),
  };
  return normalized;
}

export function createEvidenceDriver(
  driver: EvidenceDriver,
): EvidenceDriver {
  assertObservationalCopy(driver.headline, "headline");
  assertObservationalCopy(driver.detail, "detail");
  const headline = sanitizeObservationalCopy(driver.headline);
  const detail = sanitizeObservationalCopy(driver.detail);
  return {
    ...driver,
    headline,
    detail,
  };
}

export function renderEvidenceDriverHeadline(driver: EvidenceDriver): string {
  assertObservationalCopy(driver.headline, "headline");
  return driver.headline;
}
