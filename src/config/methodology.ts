/**
 * Published methodology sample gates — keep in sync with /methodology copy.
 */

import { MATRIX_MIN_GAMES } from "@/lib/ref-team-matrix";

/** Ref×team matrix cells and standout splits. */
export const REF_TEAM_SPLIT_MIN_GAMES = MATRIX_MIN_GAMES;

/** Team×crew anomaly findings and pairing notes. */
export const CREW_ANOMALY_MIN_GAMES = 12;

/** ATS / O/U splits with closing lines. */
export const ATS_OU_CLOSING_LINE_MIN_GAMES = 30;

export type MethodologyInsightCategory =
  | "ref-team-split"
  | "crew-anomaly"
  | "ats-ou";

export const METHODOLOGY_SAMPLE_GATES = {
  "ref-team-split": REF_TEAM_SPLIT_MIN_GAMES,
  "crew-anomaly": CREW_ANOMALY_MIN_GAMES,
  "ats-ou": ATS_OU_CLOSING_LINE_MIN_GAMES,
} as const satisfies Record<MethodologyInsightCategory, number>;

export const ESTIMATED_LEAGUE_AVERAGE_TOOLTIP =
  "GSNI-Adjusted League Average used due to insufficient closing-line data in sample.";
