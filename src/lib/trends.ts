import type { SeasonBaseline } from "../../scripts/lib/baselines";

export interface TrendRow {
  season: string;
  gameCount: number;
  leagueAvgTotal: number;
  leagueAvgFouls: number;
  leagueAvgMinors?: number;
  leagueOvertimeRate?: number;
}

export interface YoYNarrative {
  headline: string;
  body: string;
}

function formatDelta(value: number, unit: string, decimals = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)} ${unit}`;
}

export function seasonRowsFromBaselines(
  seasons: Record<string, SeasonBaseline>,
): TrendRow[] {
  return Object.values(seasons)
    .filter((s) => s.season !== "all")
    .sort((a, b) => a.season.localeCompare(b.season))
    .map((s) => ({
      season: s.season,
      gameCount: s.gameCount,
      leagueAvgTotal: s.leagueAvgTotal,
      leagueAvgFouls: s.leagueAvgFouls,
      leagueAvgMinors: s.leagueAvgMinors,
      leagueOvertimeRate: s.leagueOvertimeRate,
    }));
}

export function buildYoYNarrative(
  rows: TrendRow[],
  league: "NBA" | "NHL" | "NFL",
): YoYNarrative | null {
  if (rows.length < 2) return null;

  const latest = rows[rows.length - 1];
  const prior = rows[rows.length - 2];
  const scoringUnit = league === "NBA" ? "pts" : "goals";
  const scoringDelta = latest.leagueAvgTotal - prior.leagueAvgTotal;
  const foulDelta = latest.leagueAvgFouls - prior.leagueAvgFouls;

  const scoringDir =
    Math.abs(scoringDelta) < 0.3
      ? "held steady"
      : scoringDelta > 0
        ? "ticked up"
        : "ticked down";

  const foulDir =
    Math.abs(foulDelta) < 0.2
      ? "stayed flat"
      : foulDelta > 0
        ? "rose"
        : "fell";

  let body = `From ${prior.season} to ${latest.season}, combined ${scoringUnit} per game ${scoringDir} (${formatDelta(scoringDelta, scoringUnit)}) while ${league === "NBA" ? "fouls" : "penalty minutes"} ${foulDir} (${formatDelta(foulDelta, league === "NBA" ? "fouls" : "PIM")}).`;

  if (league === "NHL" && latest.leagueAvgMinors !== undefined && prior.leagueAvgMinors !== undefined) {
    const minorDelta = latest.leagueAvgMinors - prior.leagueAvgMinors;
    body += ` Two-minute minors averaged ${latest.leagueAvgMinors.toFixed(1)} per team (${formatDelta(minorDelta, "minors")} YoY).`;
  }

  if (league === "NHL" && latest.leagueOvertimeRate !== undefined && prior.leagueOvertimeRate !== undefined) {
    const otDelta = (latest.leagueOvertimeRate - prior.leagueOvertimeRate) * 100;
    body += ` Overtime rate: ${(latest.leagueOvertimeRate * 100).toFixed(1)}% (${formatDelta(otDelta, "pts", 1)} vs prior season).`;
  }

  return {
    headline: `${latest.season} vs ${prior.season}: league scoring and whistle context`,
    body,
  };
}
