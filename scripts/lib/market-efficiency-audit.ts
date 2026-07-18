/**
 * Market Efficiency Audit: join officiating crew signals with closing totals
 * and test whether ref signals predict market total delta (actual - closing).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { gsniShrinkageFromProfile } from "../../src/lib/gsni-display";
import type { RefProfile, RefStatsFile } from "../../src/lib/types";
import { loadGameLogs, type GameLogEntry } from "./game-logs";
import { refSlug } from "./slug";
import {
  simpleLinearRegression,
  type SimpleRegressionResult,
} from "./simple-regression";

export type AuditLeague =
  | "NBA"
  | "NFL"
  | "NHL"
  | "EPL"
  | "LALIGA"
  | "CBB";

export type RefSignalKind =
  | "whistle_delta"
  | "scoring_delta"
  | "over_lean"
  | "gsni_score";

export type AuditGameRecord = {
  gameId: string;
  date: string;
  season: string;
  league: AuditLeague;
  homeTeam: string;
  awayTeam: string;
  actualTotal: number;
  closingTotal: number;
  marketTotalDelta: number;
  lineSource: "external" | "synthetic";
  crewSize: number;
  whistleDelta: number | null;
  scoringDelta: number | null;
  overLean: number | null;
  gsniScore: number | null;
  totalFouls: number;
};

export type SignalStrengthBucket = {
  label: string;
  games: number;
  avgSignal: number;
  avgMarketTotalDelta: number;
  overRateVsClosing: number;
};

export type SignalAuditRow = {
  league: AuditLeague;
  signal: RefSignalKind;
  signalLabel: string;
  sampleSize: number;
  correlationWithMarketDelta: number | null;
  regressionSlope: number | null;
  pValue: number | null;
  isMarketEfficient: boolean;
  lineCoverageNote: string;
  buckets: SignalStrengthBucket[];
};

export type MarketEfficiencyAuditReport = {
  generatedAt: string;
  alphaThreshold: number;
  note: string;
  corpus: {
    league: AuditLeague;
    totalGames: number;
    externalLineGames: number;
    joinedGames: number;
    lineSource: string;
  }[];
  rows: SignalAuditRow[];
};

type CbbGameLogFile = {
  games: Array<
    GameLogEntry & {
      league: "CBB";
    }
  >;
};

const ALPHA = 0.05;

const SIGNAL_LABELS: Record<RefSignalKind, string> = {
  whistle_delta: "Crew whistle delta",
  scoring_delta: "Crew scoring delta",
  over_lean: "Crew over lean",
  gsni_score: "Crew GSNI (shrunk)",
};

const LINE_SOURCE_NOTES: Record<AuditLeague, string> = {
  NBA: "The Odds API historical (data/game-lines.json) or merge-market-lines",
  NFL: "nflverse closing lines (data/nfl/game-lines.json)",
  NHL: "The Odds API / sportsbook shards via merge-market-lines",
  EPL: "football-data ingest closing totals",
  LALIGA: "ESPN pickcenter at ingest",
  CBB: "ESPN pickcenter at ingest (data/cbb/game-logs.json)",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function refStatsPath(league: AuditLeague): string {
  const root = path.join(process.cwd(), "data");
  switch (league) {
    case "NBA":
      return path.join(root, "ref-stats.json");
    case "NFL":
      return path.join(root, "nfl", "ref-stats.json");
    case "NHL":
      return path.join(root, "nhl", "ref-stats.json");
    case "EPL":
      return path.join(root, "epl", "ref-stats.json");
    case "LALIGA":
      return path.join(root, "laliga", "ref-stats.json");
    case "CBB":
      return path.join(root, "cbb", "ref-stats.json");
  }
}

function loadRefIndex(league: AuditLeague): Map<string, RefProfile> {
  const stats = readJson<RefStatsFile>(refStatsPath(league));
  const index = new Map<string, RefProfile>();
  if (!stats) return index;
  for (const ref of stats.refs) {
    index.set(ref.slug, ref);
  }
  return index;
}

function crewSignalAverage(
  officials: { name: string; number: number }[],
  refIndex: Map<string, RefProfile>,
  pick: (ref: RefProfile) => number | null | undefined,
): number | null {
  const values: number[] = [];
  for (const official of officials) {
    const ref = refIndex.get(refSlug(official.name, official.number));
    if (!ref) continue;
    const value = pick(ref);
    if (value === null || value === undefined || !Number.isFinite(value)) {
      continue;
    }
    values.push(value);
  }
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function gsniCrewScore(
  officials: { name: string; number: number }[],
  refIndex: Map<string, RefProfile>,
): number | null {
  const values: number[] = [];
  for (const official of officials) {
    const ref = refIndex.get(refSlug(official.name, official.number));
    if (!ref) continue;
    const gsni = gsniShrinkageFromProfile(ref);
    if (!gsni) continue;
    values.push(gsni.display - 50);
  }
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toAuditGame(
  game: GameLogEntry & { league: AuditLeague },
  refIndex: Map<string, RefProfile>,
): AuditGameRecord | null {
  if (game.lineSource !== "external") return null;
  if (!Number.isFinite(game.closingTotal) || game.closingTotal <= 0) return null;
  if (!game.officials?.length) return null;

  const whistleDelta = crewSignalAverage(
    game.officials,
    refIndex,
    (ref) => ref.foulsDelta,
  );
  const scoringDelta = crewSignalAverage(
    game.officials,
    refIndex,
    (ref) => ref.totalPointsDelta,
  );
  const overLean = crewSignalAverage(
    game.officials,
    refIndex,
    (ref) => ref.overRate - 0.5,
  );
  const gsniScore =
    game.league === "NFL"
      ? gsniCrewScore(game.officials, refIndex)
      : null;

  return {
    gameId: game.gameId,
    date: game.date,
    season: game.season,
    league: game.league,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    actualTotal: game.totalPoints,
    closingTotal: game.closingTotal,
    marketTotalDelta: round2(game.totalPoints - game.closingTotal),
    lineSource: game.lineSource,
    crewSize: game.officials.length,
    whistleDelta:
      whistleDelta === null ? null : round2(whistleDelta),
    scoringDelta:
      scoringDelta === null ? null : round2(scoringDelta),
    overLean: overLean === null ? null : round4(overLean),
    gsniScore: gsniScore === null ? null : round2(gsniScore),
    totalFouls: game.totalFouls,
  };
}

function loadLeagueGames(league: AuditLeague): GameLogEntry[] {
  if (league === "CBB") {
    const file = readJson<CbbGameLogFile>(
      path.join(process.cwd(), "data", "cbb", "game-logs.json"),
    );
    return file?.games ?? [];
  }
  return loadGameLogs(league)?.games ?? [];
}

export function buildAuditCorpus(): AuditGameRecord[] {
  const leagues: AuditLeague[] = [
    "NBA",
    "NFL",
    "NHL",
    "EPL",
    "LALIGA",
    "CBB",
  ];
  const records: AuditGameRecord[] = [];

  for (const league of leagues) {
    const refIndex = loadRefIndex(league);
    const games = loadLeagueGames(league);
    for (const game of games) {
      const record = toAuditGame(
        { ...game, league },
        refIndex,
      );
      if (record) records.push(record);
    }
  }

  return records.sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
  );
}

function signalValue(
  record: AuditGameRecord,
  signal: RefSignalKind,
): number | null {
  switch (signal) {
    case "whistle_delta":
      return record.whistleDelta;
    case "scoring_delta":
      return record.scoringDelta;
    case "over_lean":
      return record.overLean;
    case "gsni_score":
      return record.gsniScore;
  }
}

function buildBuckets(
  pairs: Array<{ signal: number; delta: number }>,
): SignalStrengthBucket[] {
  if (pairs.length < 9) return [];

  const sorted = [...pairs].sort((a, b) => a.signal - b.signal);
  const size = Math.floor(sorted.length / 3);
  const groups = [
    { label: "Low signal", slice: sorted.slice(0, size) },
    { label: "Mid signal", slice: sorted.slice(size, size * 2) },
    {
      label: "High signal",
      slice: sorted.slice(size * 2),
    },
  ];

  return groups.map(({ label, slice }) => {
    const games = slice.length;
    const avgSignal =
      slice.reduce((sum, row) => sum + row.signal, 0) / games;
    const avgMarketTotalDelta =
      slice.reduce((sum, row) => sum + row.delta, 0) / games;
    const overs = slice.filter((row) => row.delta > 0).length;
    return {
      label,
      games,
      avgSignal: round2(avgSignal),
      avgMarketTotalDelta: round2(avgMarketTotalDelta),
      overRateVsClosing: round4(overs / games),
    };
  });
}

function analyzeSignal(
  records: AuditGameRecord[],
  league: AuditLeague,
  signal: RefSignalKind,
): SignalAuditRow | null {
  const leagueRecords = records.filter((record) => record.league === league);
  const pairs: Array<{ signal: number; delta: number }> = [];

  for (const record of leagueRecords) {
    const value = signalValue(record, signal);
    if (value === null || !Number.isFinite(value)) continue;
    pairs.push({ signal: value, delta: record.marketTotalDelta });
  }

  if (pairs.length < 30) {
    return {
      league,
      signal,
      signalLabel: SIGNAL_LABELS[signal],
      sampleSize: pairs.length,
      correlationWithMarketDelta: null,
      regressionSlope: null,
      pValue: null,
      isMarketEfficient: true,
      lineCoverageNote: LINE_SOURCE_NOTES[league],
      buckets: buildBuckets(pairs),
    };
  }

  const xs = pairs.map((row) => row.signal);
  const ys = pairs.map((row) => row.delta);
  const regression: SimpleRegressionResult | null = simpleLinearRegression(xs, ys);

  const pValue = regression?.pValue ?? null;
  const correlation = regression?.correlation ?? null;
  const isMarketEfficient =
    pValue === null ? true : pValue >= ALPHA || Math.abs(correlation ?? 0) < 0.02;

  return {
    league,
    signal,
    signalLabel: SIGNAL_LABELS[signal],
    sampleSize: pairs.length,
    correlationWithMarketDelta: correlation,
    regressionSlope: regression?.slope ?? null,
    pValue,
    isMarketEfficient,
    lineCoverageNote: LINE_SOURCE_NOTES[league],
    buckets: buildBuckets(pairs),
  };
}

export function runMarketEfficiencyAudit(
  records = buildAuditCorpus(),
): MarketEfficiencyAuditReport {
  const leagues: AuditLeague[] = [
    "NBA",
    "NFL",
    "NHL",
    "EPL",
    "LALIGA",
    "CBB",
  ];

  const corpus = leagues.map((league) => {
    const allGames = loadLeagueGames(league);
    const external = allGames.filter((game) => game.lineSource === "external");
    const joined = records.filter((record) => record.league === league);
    return {
      league,
      totalGames: allGames.length,
      externalLineGames: external.length,
      joinedGames: joined.length,
      lineSource: LINE_SOURCE_NOTES[league],
    };
  });

  const rows: SignalAuditRow[] = [];
  for (const league of leagues) {
    const signals: RefSignalKind[] =
      league === "NFL"
        ? ["whistle_delta", "scoring_delta", "over_lean", "gsni_score"]
        : ["whistle_delta", "scoring_delta", "over_lean"];

    for (const signal of signals) {
      const row = analyzeSignal(records, league, signal);
      if (row) rows.push(row);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    alphaThreshold: ALPHA,
    note:
      "Market total delta = actual combined score minus closing total. " +
      "Efficient market (Yes) means the ref signal does not significantly predict " +
      "that delta at p < 0.05. Inefficient (No) suggests possible unpriced alpha.",
    corpus,
    rows,
  };
}

export function formatAuditMarkdown(report: MarketEfficiencyAuditReport): string {
  const lines: string[] = [
    "# Market Efficiency Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Corpus coverage",
    "",
    "| League | Total games | External lines | Joined audit games | Line source |",
    "| --- | ---: | ---: | ---: | --- |",
  ];

  for (const entry of report.corpus) {
    lines.push(
      `| ${entry.league} | ${entry.totalGames.toLocaleString()} | ${entry.externalLineGames.toLocaleString()} | ${entry.joinedGames.toLocaleString()} | ${entry.lineSource} |`,
    );
  }

  lines.push(
    "",
    "## Predictive power summary",
    "",
    "Market efficient = **Yes** when the ref signal does not significantly predict total delta (p >= 0.05).",
    "",
    "| Signal | League | n | Correlation | p-value | Market efficient? |",
    "| --- | --- | ---: | ---: | ---: | --- |",
  );

  for (const row of report.rows) {
    const corr =
      row.correlationWithMarketDelta === null
        ? "-"
        : row.correlationWithMarketDelta.toFixed(3);
    const p =
      row.pValue === null ? "-" : row.pValue.toFixed(4);
    lines.push(
      `| ${row.signalLabel} | ${row.league} | ${row.sampleSize} | ${corr} | ${p} | ${row.isMarketEfficient ? "Yes" : "**No**"} |`,
    );
  }

  lines.push("", "## Signal strength buckets (market total delta by tertile)", "");

  for (const row of report.rows) {
    if (row.buckets.length === 0) continue;
    lines.push(`### ${row.league} - ${row.signalLabel}`, "");
    lines.push(
      "| Bucket | Games | Avg signal | Avg market delta | Over closing rate |",
      "| --- | ---: | ---: | ---: | ---: |",
    );
    for (const bucket of row.buckets) {
      lines.push(
        `| ${bucket.label} | ${bucket.games} | ${bucket.avgSignal.toFixed(2)} | ${bucket.avgMarketTotalDelta.toFixed(2)} | ${(bucket.overRateVsClosing * 100).toFixed(1)}% |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Data pipeline",
    "",
    "1. Game logs with officiating crews and play-level whistle context",
    "2. Closing totals joined from The Odds API (NBA/NHL), nflverse (NFL), or ESPN pickcenter (CBB/soccer)",
    "3. Crew signals from ref-stats profiles (whistle delta, scoring delta, over lean, GSNI for NFL)",
    "4. OLS regression: market total delta ~ ref signal",
    "",
    "Run `npm run fetch-nba-historical-lines` (paid Odds API) and `npm run merge-market-lines` to expand NBA/NHL external-line coverage.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

export function writeAuditArtifacts(
  report: MarketEfficiencyAuditReport,
  root = process.cwd(),
): { jsonPath: string; markdownPath: string } {
  const jsonPath = path.join(root, "data", "market-efficiency-audit.json");
  const markdownPath = path.join(root, "MARKET-EFFICIENCY-AUDIT.md");

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, formatAuditMarkdown(report));

  return { jsonPath, markdownPath };
}
