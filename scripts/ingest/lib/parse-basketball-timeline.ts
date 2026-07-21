import type {
  CrewStoppageEvent,
  CrewStoppageKind,
  ScoringPlayEvent,
} from "../../src/lib/types";

type NbaPlayByPlayRow = {
  PERIOD: number;
  PCTIMESTRING: string;
  SCORE: string;
  SCOREMARGIN: string;
  HOMEDESCRIPTION: string | null;
  VISITORDESCRIPTION: string | null;
  NEUTRALDESCRIPTION: string | null;
  EVENTMSGTYPE: number;
  EVENTMSGACTIONTYPE: number;
  PLAYER1_TEAM_ABBREVIATION?: string | null;
  PLAYER2_TEAM_ABBREVIATION?: string | null;
  PLAYER3_TEAM_ABBREVIATION?: string | null;
};

const PERIOD_SECONDS = 12 * 60;
const OT_PERIOD_SECONDS = 5 * 60;

function parseClock(period: number, clock: string): number {
  const [minutes, seconds] = clock.split(":").map((part) => Number(part));
  const periodLength = period > 4 ? OT_PERIOD_SECONDS : PERIOD_SECONDS;
  const elapsedInPeriod = periodLength - (minutes * 60 + seconds);
  const priorPeriods = period > 4 ? 4 * PERIOD_SECONDS + (period - 5) * OT_PERIOD_SECONDS : (period - 1) * PERIOD_SECONDS;
  return priorPeriods + elapsedInPeriod;
}

function parseScore(score: string): { home: number; away: number } | null {
  const match = score.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;
  return { home: Number(match[1]), away: Number(match[2]) };
}

function teamFromDescription(
  row: NbaPlayByPlayRow,
  homeTeam: string,
  awayTeam: string,
): string | null {
  if (row.PLAYER1_TEAM_ABBREVIATION) return row.PLAYER1_TEAM_ABBREVIATION;
  if (row.HOMEDESCRIPTION) return homeTeam;
  if (row.VISITORDESCRIPTION) return awayTeam;
  return null;
}

function pointsFromEvent(row: NbaPlayByPlayRow): number {
  if (row.EVENTMSGTYPE === 1) return 1;
  if (row.EVENTMSGTYPE === 2) return 2;
  if (row.EVENTMSGTYPE === 3) return 3;
  return 0;
}

function stoppageKindFromEvent(row: NbaPlayByPlayRow): CrewStoppageKind | null {
  if (row.EVENTMSGTYPE === 6) return "subjective-foul";
  if (row.EVENTMSGTYPE === 7) return "mandatory-foul";
  if (row.EVENTMSGTYPE === 9) return "administrative";
  if (row.EVENTMSGTYPE === 11) return "video-review";
  if (row.EVENTMSGTYPE === 18) return "technical";
  return null;
}

export function parseNbaPlayByPlayTimeline(
  rows: NbaPlayByPlayRow[],
  homeTeam: string,
  awayTeam: string,
): {
  scoringPlays: ScoringPlayEvent[];
  crewStoppages: CrewStoppageEvent[];
} {
  const scoringPlays: ScoringPlayEvent[] = [];
  const crewStoppages: CrewStoppageEvent[] = [];
  let previousScore: { home: number; away: number } | null = null;

  for (const row of rows) {
    const time = parseClock(row.PERIOD, row.PCTIMESTRING);
    const score = parseScore(row.SCORE);
    const points = pointsFromEvent(row);

    if (points > 0 && score) {
      const team = teamFromDescription(row, homeTeam, awayTeam);
      if (team) {
        scoringPlays.push({
          team,
          points,
          gameSecondsElapsed: time,
          period: row.PERIOD,
        });
      }
      previousScore = score;
    } else if (score && previousScore) {
      previousScore = score;
    }

    const stoppageKind = stoppageKindFromEvent(row);
    if (stoppageKind) {
      const team = teamFromDescription(row, homeTeam, awayTeam) ?? homeTeam;
      crewStoppages.push({
        kind: stoppageKind,
        team,
        gameSecondsElapsed: time,
        period: row.PERIOD,
        mandatory: stoppageKind === "mandatory-foul",
      });
    }
  }

  return { scoringPlays, crewStoppages };
}

export type { NbaPlayByPlayRow };
