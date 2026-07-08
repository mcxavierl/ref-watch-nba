import { LEAGUES, type LeagueId } from "@/lib/leagues";
import type { SeasonBaseline } from "../../scripts/lib/baselines";

export type TrendLeague = "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";

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

const TREND_LEAGUE_TO_ID: Record<TrendLeague, LeagueId> = {
  NBA: "nba",
  NHL: "nhl",
  NFL: "nfl",
  EPL: "epl",
  CBB: "cbb",
  CFB: "cfb",
};

export function trendWhistleValue(
  row: TrendRow,
  league: TrendLeague | LeagueId,
): number | undefined {
  const leagueId =
    typeof league === "string" && league in TREND_LEAGUE_TO_ID
      ? TREND_LEAGUE_TO_ID[league as TrendLeague]
      : (league as LeagueId);
  if (LEAGUES[leagueId].whistleFromMinors) {
    return row.leagueAvgMinors;
  }
  return row.leagueAvgFouls;
}

function narrativeWhistleDelta(
  latest: TrendRow,
  prior: TrendRow,
  league: TrendLeague,
): { delta: number; prose: string; unit: string } {
  if (league === "NHL") {
    return {
      delta: latest.leagueAvgFouls - prior.leagueAvgFouls,
      prose: "penalty minutes",
      unit: "PIM",
    };
  }
  const leagueId = TREND_LEAGUE_TO_ID[league];
  const latestVal = trendWhistleValue(latest, league);
  const priorVal = trendWhistleValue(prior, league);
  const label = LEAGUES[leagueId].metrics.whistleShort.toLowerCase();
  return {
    delta:
      latestVal !== undefined && priorVal !== undefined
        ? latestVal - priorVal
        : latest.leagueAvgFouls - prior.leagueAvgFouls,
    prose: label,
    unit: label,
  };
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
  league: TrendLeague,
): YoYNarrative | null {
  if (rows.length < 2) return null;

  const latest = rows[rows.length - 1];
  const prior = rows[rows.length - 2];
  const leagueId = TREND_LEAGUE_TO_ID[league];
  const scoringUnit =
    league === "NBA" || league === "NFL" || league === "CBB" || league === "CFB"
      ? "pts"
      : "goals";
  const scoringDelta = latest.leagueAvgTotal - prior.leagueAvgTotal;
  const { delta: whistleDelta, prose: whistleProse, unit: whistleUnit } =
    narrativeWhistleDelta(latest, prior, league);

  const scoringDir =
    Math.abs(scoringDelta) < 0.3
      ? "held steady"
      : scoringDelta > 0
        ? "ticked up"
        : "ticked down";

  const foulDir =
    Math.abs(whistleDelta) < 0.2
      ? "stayed flat"
      : whistleDelta > 0
        ? "rose"
        : "fell";

  let body = `From ${prior.season} to ${latest.season}, combined ${scoringUnit} per game ${scoringDir} (${formatDelta(scoringDelta, scoringUnit)}) while ${whistleProse} ${foulDir} (${formatDelta(whistleDelta, whistleUnit)}).`;

  if (
    LEAGUES[leagueId].whistleFromMinors &&
    latest.leagueAvgMinors !== undefined &&
    prior.leagueAvgMinors !== undefined
  ) {
    const minorDelta = latest.leagueAvgMinors - prior.leagueAvgMinors;
    body += ` Two-minute minors averaged ${latest.leagueAvgMinors.toFixed(1)} per team (${formatDelta(minorDelta, "minors")} YoY).`;
  }

  if (
    LEAGUES[leagueId].showOtRate &&
    latest.leagueOvertimeRate !== undefined &&
    prior.leagueOvertimeRate !== undefined
  ) {
    const otDelta = (latest.leagueOvertimeRate - prior.leagueOvertimeRate) * 100;
    body += ` Overtime rate: ${(latest.leagueOvertimeRate * 100).toFixed(1)}% (${formatDelta(otDelta, "pp", 1)} vs prior season).`;
  }

  return {
    headline: `${latest.season} vs ${prior.season}: league scoring and whistle context`,
    body,
  };
}
