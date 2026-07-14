import type { CfbGameSummary } from "./espn";

export interface ContractViolation {
  path: string;
  expected: string;
  actual: string;
}

export interface ContractValidationResult {
  valid: boolean;
  violations: ContractViolation[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Contract-first validation for a normalized CFB game summary. */
export function validateCfbGameSummaryContract(
  summary: CfbGameSummary | null | undefined,
): ContractValidationResult {
  const violations: ContractViolation[] = [];

  if (!summary || typeof summary !== "object") {
    return {
      valid: false,
      violations: [{ path: "summary", expected: "object", actual: String(summary) }],
    };
  }

  const requiredStrings: (keyof CfbGameSummary)[] = [
    "gameId",
    "date",
    "season",
    "awayAbbr",
    "homeAbbr",
    "status",
  ];
  for (const key of requiredStrings) {
    if (!isNonEmptyString(summary[key])) {
      violations.push({
        path: key,
        expected: "non-empty string",
        actual: String(summary[key]),
      });
    }
  }

  const requiredNumbers: (keyof CfbGameSummary)[] = [
    "awayScore",
    "homeScore",
    "homeFlags",
    "awayFlags",
    "homePenaltyYards",
    "awayPenaltyYards",
    "closingTotal",
    "homeSpread",
  ];
  for (const key of requiredNumbers) {
    if (!isFiniteNumber(summary[key])) {
      violations.push({
        path: key,
        expected: "finite number",
        actual: String(summary[key]),
      });
    }
  }

  if (summary.lineSource !== "external" && summary.lineSource !== "synthetic") {
    violations.push({
      path: "lineSource",
      expected: '"external" | "synthetic"',
      actual: String(summary.lineSource),
    });
  }

  if (!Array.isArray(summary.officials)) {
    violations.push({
      path: "officials",
      expected: "array",
      actual: String(summary.officials),
    });
  } else {
    for (const [index, official] of summary.officials.entries()) {
      if (!isNonEmptyString(official.fullName)) {
        violations.push({
          path: `officials[${index}].fullName`,
          expected: "non-empty string",
          actual: String(official.fullName),
        });
      }
    }
  }

  if (summary.status !== "STATUS_FINAL") {
    violations.push({
      path: "status",
      expected: "STATUS_FINAL",
      actual: String(summary.status),
    });
  }

  return { valid: violations.length === 0, violations };
}
