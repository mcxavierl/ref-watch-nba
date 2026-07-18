/** Files that affect walk-forward validation output. */
export const VALIDATION_ARTIFACT_REL = "data/backtest-results.json";

export const VALIDATION_ARTIFACT_SOURCES = [
  "data/game-logs.json",
  "data/nhl/game-logs.json",
  "data/game-lines.json",
  "scripts/backtest.ts",
  "scripts/lib/game-logs.ts",
  "scripts/lib/ref-betting.ts",
] as const;

export type ValidationArtifactSource = (typeof VALIDATION_ARTIFACT_SOURCES)[number];

export function isValidationArtifactSource(file: string): file is ValidationArtifactSource {
  return (VALIDATION_ARTIFACT_SOURCES as readonly string[]).includes(file);
}
