import backtestResults from "../../data/backtest-results.json";

export type ValidationBucket = {
  label: string;
  sampleSize: number;
  ouHitRate: number | null;
  atsHitRate: number | null;
  roiPct: number | null;
};

export type ValidationSignalReport = {
  signal: string;
  methodology: string;
  summary: string;
  realLineGames: number;
  breakEvenRate: number;
  exclusions: {
    syntheticLines: number;
    missingOfficials: number;
    insufficientHistory: number;
  };
  buckets: ValidationBucket[];
};

export type ValidationReport = {
  generatedAt: string;
  note: string;
  nbaWhistlePremium: ValidationSignalReport;
  nhlPpPremium: ValidationSignalReport;
  hasExternalLineCoverage: boolean;
};

function mapSignalReport(raw: (typeof backtestResults)["nbaWhistlePremium"]): ValidationSignalReport {
  return {
    signal: raw.signal,
    methodology: raw.methodology,
    summary: raw.summary,
    realLineGames: raw.realLineGames,
    breakEvenRate: raw.breakEvenRate,
    exclusions: raw.exclusions,
    buckets: raw.buckets.map((bucket) => ({
      label: bucket.label,
      sampleSize: bucket.sampleSize,
      ouHitRate: bucket.ouHitRate,
      atsHitRate: bucket.atsHitRate,
      roiPct: bucket.roiPct,
    })),
  };
}

/** Load the committed walk-forward backtest report for public validation surfaces. */
export function loadValidationReport(): ValidationReport {
  const nba = mapSignalReport(backtestResults.nbaWhistlePremium);
  const nhl = mapSignalReport(backtestResults.nhlPpPremium);

  return {
    generatedAt: backtestResults.generatedAt,
    note: backtestResults.note,
    nbaWhistlePremium: nba,
    nhlPpPremium: nhl,
    hasExternalLineCoverage: nba.realLineGames > 0 || nhl.realLineGames > 0,
  };
}

export function formatHitRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatRoiPct(roi: number | null): string {
  if (roi === null) return "—";
  const sign = roi > 0 ? "+" : "";
  return `${sign}${roi.toFixed(1)}%`;
}
