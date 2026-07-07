#!/usr/bin/env npx tsx
/**
 * Walk-forward backtest for NBA Whistle Premium and NHL PP Premium signals.
 * Only games with external closing lines (lineSource === "external") are scored.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { priorSeasonBaseline } from "./lib/baselines";
import {
  isRealLineGame,
  loadGameLogs,
  type GameLogEntry,
} from "./lib/game-logs";
import { homeAtsResult, overResult } from "./lib/ref-betting";
import { refSlug } from "./lib/slug";

const BREAK_EVEN_RATE = 110 / 210; // 52.38% at -110
const MIN_SAMPLE_NBA = 30;
const MIN_QUALIFIED_REFS = 2;
const HIGH_PACE_SCORING = 4;
const HIGH_PACE_GAP = 3;
const LOW_PACE_SCORING = -4;
const LOW_PACE_GAP = -3;
const PP_PREMIUM_THRESHOLD = 0.35;
const MIN_REF_GAMES_NHL = 25;

type SampleQuality = "strong" | "moderate" | "weak";
type PaceAlert = "high_pace" | "low_pace" | null;

interface RefPriorGame {
  totalPoints: number;
  totalFouls: number;
  homeMinors?: number;
  awayMinors?: number;
}

interface BucketStats {
  label: string;
  sampleSize: number;
  ouWins: number;
  ouLosses: number;
  ouPushes: number;
  ouHitRate: number | null;
  atsWins: number;
  atsLosses: number;
  atsPushes: number;
  atsHitRate: number | null;
  roiPct: number | null;
}

interface SignalBacktest {
  signal: string;
  methodology: string;
  exclusions: {
    syntheticLines: number;
    missingOfficials: number;
    insufficientHistory: number;
  };
  realLineGames: number;
  breakEvenRate: number;
  buckets: BucketStats[];
  summary: string;
}

interface BacktestResults {
  generatedAt: string;
  note: string;
  nbaWhistlePremium: SignalBacktest;
  nhlPpPremium: SignalBacktest;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function hitRate(wins: number, losses: number): number | null {
  const decisions = wins + losses;
  return decisions > 0 ? round3(wins / decisions) : null;
}

function roiAtMinus110(wins: number, losses: number): number | null {
  const bets = wins + losses;
  if (bets === 0) return null;
  const profit = wins * (100 / 110) - losses;
  return round1((profit / bets) * 100);
}

function emptyBucket(label: string): BucketStats {
  return {
    label,
    sampleSize: 0,
    ouWins: 0,
    ouLosses: 0,
    ouPushes: 0,
    ouHitRate: null,
    atsWins: 0,
    atsLosses: 0,
    atsPushes: 0,
    atsHitRate: null,
    roiPct: null,
  };
}

function finalizeBucket(bucket: BucketStats): BucketStats {
  bucket.ouHitRate = hitRate(bucket.ouWins, bucket.ouLosses);
  bucket.atsHitRate = hitRate(bucket.atsWins, bucket.atsLosses);
  bucket.roiPct = roiAtMinus110(bucket.ouWins, bucket.ouLosses);
  return bucket;
}

function recordOu(
  bucket: BucketStats,
  result: "win" | "loss" | "push",
): void {
  bucket.sampleSize++;
  if (result === "win") bucket.ouWins++;
  else if (result === "loss") bucket.ouLosses++;
  else bucket.ouPushes++;
}

function recordAts(
  bucket: BucketStats,
  result: "win" | "loss" | "push",
): void {
  if (result === "win") bucket.atsWins++;
  else if (result === "loss") bucket.atsLosses++;
  else bucket.atsPushes++;
}

function sampleQuality(
  qualifiedRefs: number,
  sampleGames: number,
): SampleQuality {
  if (qualifiedRefs >= 2 && sampleGames >= 60) return "strong";
  if (qualifiedRefs >= 2 && sampleGames >= 40) return "moderate";
  return "weak";
}

function computePriorCrewMetrics(
  crew: GameLogEntry["officials"],
  refHistory: Map<string, RefPriorGame[]>,
  leagueAvgTotal: number,
  leagueAvgFouls: number,
  minSample: number,
): {
  avgTotalPoints: number;
  avgFouls: number;
  scoringPremium: number;
  qualifiedRefCount: number;
  sampleGames: number;
  sampleQuality: SampleQuality;
} | null {
  const qualified: { games: RefPriorGame[] }[] = [];
  let sampleGames = 0;

  for (const official of crew) {
    const slug = refSlug(official.name, official.number);
    const games = refHistory.get(slug) ?? [];
    if (games.length >= minSample) {
      qualified.push({ games });
      sampleGames = Math.max(sampleGames, games.length);
    }
  }

  const pool =
    qualified.length > 0
      ? qualified
      : crew
          .map((o) => {
            const games = refHistory.get(refSlug(o.name, o.number)) ?? [];
            return games.length > 0 ? { games } : null;
          })
          .filter((p): p is { games: RefPriorGame[] } => p !== null);

  if (pool.length === 0) return null;

  const n = pool.length;
  const avgTotal =
    pool.reduce(
      (s, p) => s + p.games.reduce((a, g) => a + g.totalPoints, 0) / p.games.length,
      0,
    ) / n;
  const avgFouls =
    pool.reduce(
      (s, p) => s + p.games.reduce((a, g) => a + g.totalFouls, 0) / p.games.length,
      0,
    ) / n;

  const qualifiedRefCount = qualified.length;
  return {
    avgTotalPoints: round1(avgTotal),
    avgFouls: round1(avgFouls),
    scoringPremium: round1(avgTotal - leagueAvgTotal),
    qualifiedRefCount,
    sampleGames,
    sampleQuality: sampleQuality(qualifiedRefCount, sampleGames),
  };
}

function nbaPaceAlert(
  scoringPremium: number,
  gapVsBenchmark: number,
  qualifiedRefCount: number,
  quality: SampleQuality,
): { alert: PaceAlert; gateCleared: boolean; direction: "over" | "under" | null } {
  const gateCleared =
    quality !== "weak" && qualifiedRefCount >= MIN_QUALIFIED_REFS;

  if (
    scoringPremium >= HIGH_PACE_SCORING &&
    gapVsBenchmark >= HIGH_PACE_GAP
  ) {
    return { alert: gateCleared ? "high_pace" : null, gateCleared, direction: "over" };
  }
  if (
    scoringPremium <= LOW_PACE_SCORING &&
    gapVsBenchmark <= LOW_PACE_GAP
  ) {
    return { alert: gateCleared ? "low_pace" : null, gateCleared, direction: "under" };
  }
  return { alert: null, gateCleared, direction: null };
}

function backtestNbaWhistlePremium(games: GameLogEntry[]): SignalBacktest {
  const exclusions = {
    syntheticLines: 0,
    missingOfficials: 0,
    insufficientHistory: 0,
  };

  const buckets = {
    signalClearedHigh: emptyBucket("Signal cleared — high pace (bet Over)"),
    signalClearedLow: emptyBucket("Signal cleared — low pace (bet Under)"),
    gateNotCleared: emptyBucket("Threshold met, sample gate not cleared"),
    noSignal: emptyBucket("No signal (control)"),
    allRealLine: emptyBucket("All real-line games (coin-flip control)"),
  };

  const sorted = [...games].sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
  );
  const refHistory = new Map<string, RefPriorGame[]>();
  const priorGames: GameLogEntry[] = [];

  for (const game of sorted) {
    if (!isRealLineGame(game)) {
      exclusions.syntheticLines++;
      continue;
    }
    if (game.officials.length === 0) {
      exclusions.missingOfficials++;
      continue;
    }

    const baseline = priorSeasonBaseline(game, priorGames);
    const metrics = computePriorCrewMetrics(
      game.officials,
      refHistory,
      baseline.leagueAvgTotal,
      baseline.leagueAvgFouls,
      MIN_SAMPLE_NBA,
    );

    if (!metrics) {
      exclusions.insufficientHistory++;
    } else {
      const gapVsBenchmark = round1(
        metrics.avgTotalPoints - game.closingTotal,
      );
      const { alert, gateCleared, direction } = nbaPaceAlert(
        metrics.scoringPremium,
        gapVsBenchmark,
        metrics.qualifiedRefCount,
        metrics.sampleQuality,
      );

      const ouResult = overResult(game.totalPoints, game.closingTotal);
      recordOu(buckets.allRealLine, ouResult);

      let targetBucket = buckets.noSignal;
      if (alert === "high_pace") targetBucket = buckets.signalClearedHigh;
      else if (alert === "low_pace") targetBucket = buckets.signalClearedLow;
      else if (!gateCleared && direction) targetBucket = buckets.gateNotCleared;

      if (direction) {
        const betResult =
          direction === "over"
            ? ouResult
            : ouResult === "win"
              ? "loss"
              : ouResult === "loss"
                ? "win"
                : "push";
        recordOu(targetBucket, betResult);
        const ats = homeAtsResult(
          game.homeScore,
          game.awayScore,
          game.homeSpread,
        );
        recordAts(targetBucket, ats);
      } else {
        recordOu(targetBucket, ouResult);
      }
    }

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      const hist = refHistory.get(slug) ?? [];
      hist.push({
        totalPoints: game.totalPoints,
        totalFouls: game.totalFouls,
      });
      refHistory.set(slug, hist);
    }
    priorGames.push(game);
  }

  const realLineGames =
    buckets.allRealLine.sampleSize;
  const bucketList = Object.values(buckets).map(finalizeBucket);

  const cleared = bucketList[0].sampleSize + bucketList[1].sampleSize;
  const clearedHit =
    cleared > 0
      ? round3(
          (bucketList[0].ouWins + bucketList[1].ouWins) /
            (bucketList[0].ouWins +
              bucketList[0].ouLosses +
              bucketList[1].ouWins +
              bucketList[1].ouLosses),
        )
      : null;

  return {
    signal: "NBA Whistle Premium (pace alert)",
    methodology:
      "Walk-forward: ref crew averages exclude target game and later games. " +
      "High pace: scoring premium ≥ +4 and gap vs closing total ≥ +3. " +
      "Low pace: scoring premium ≤ −4 and gap ≤ −3. Sample gate: ≥2 qualified refs (30+ games) and non-weak sample.",
    exclusions,
    realLineGames,
    breakEvenRate: BREAK_EVEN_RATE,
    buckets: bucketList,
    summary:
      realLineGames === 0
        ? "No external-line NBA games in game logs — backtest not scored."
        : cleared === 0
          ? `${realLineGames} real-line games; no cleared pace alerts fired.`
          : `Cleared signals: ${cleared} bets, ${clearedHit !== null ? (clearedHit * 100).toFixed(1) : "n/a"}% O/U hit rate vs ${(BREAK_EVEN_RATE * 100).toFixed(2)}% break-even.`,
  };
}

function loadNhlSpecialTeams(): Record<
  string,
  { ppPct: number; pkPct: number }
> {
  const filePath = path.join(
    process.cwd(),
    "data",
    "nhl",
    "team-special-teams.json",
  );
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      teams: Record<string, { ppPct: number; pkPct: number }>;
    };
    return raw.teams ?? {};
  } catch {
    return {};
  }
}

function specialTeamsEdge(
  home: string,
  away: string,
  teams: Record<string, { ppPct: number; pkPct: number }>,
): number {
  const h = teams[home];
  const a = teams[away];
  if (!h || !a) return 0;
  return h.ppPct + a.ppPct - h.pkPct - a.pkPct;
}

function backtestNhlPpPremium(games: GameLogEntry[]): SignalBacktest {
  const exclusions = {
    syntheticLines: 0,
    missingOfficials: 0,
    insufficientHistory: 0,
  };

  const buckets = {
    signalCleared: emptyBucket("PP Premium cleared (bet Over)"),
    gateNotCleared: emptyBucket("Below threshold (control)"),
    noSignal: emptyBucket("No qualifying refs (control)"),
    allRealLine: emptyBucket("All real-line games (coin-flip control)"),
  };

  const teamMap = loadNhlSpecialTeams();
  const sorted = [...games].sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
  );
  const refMinorHistory = new Map<string, RefPriorGame[]>();
  const priorGames: GameLogEntry[] = [];

  for (const game of sorted) {
    if (!isRealLineGame(game)) {
      exclusions.syntheticLines++;
      continue;
    }

    const refs = game.officials.filter((o) => o.role === "referee");
    if (refs.length === 0) {
      exclusions.missingOfficials++;
      continue;
    }

    const baseline = priorSeasonBaseline(game, priorGames);
    const leagueAvgMinors = baseline.leagueAvgMinors ?? 5.5;
    const minorRates: number[] = [];
    let sampleGames = 0;

    for (const official of refs) {
      const slug = refSlug(official.name, official.number);
      const hist = refMinorHistory.get(slug) ?? [];
      if (hist.length < MIN_REF_GAMES_NHL) continue;
      const avgMinors =
        hist.reduce(
          (s, g) => s + (g.homeMinors ?? 0) + (g.awayMinors ?? 0),
          0,
        ) / hist.length;
      minorRates.push(avgMinors);
      sampleGames = Math.max(sampleGames, hist.length);
    }

    const ouResult = overResult(game.totalPoints, game.closingTotal);
    recordOu(buckets.allRealLine, ouResult);

    if (minorRates.length === 0) {
      exclusions.insufficientHistory++;
      recordOu(buckets.noSignal, ouResult);
    } else {
      const refMinorRate =
        minorRates.reduce((a, b) => a + b, 0) / minorRates.length;
      const stEdge = specialTeamsEdge(
        game.homeTeam,
        game.awayTeam,
        teamMap,
      );
      const minorDelta = refMinorRate - leagueAvgMinors;
      const index = round1(minorDelta * stEdge * 8);

      let target = buckets.gateNotCleared;
      if (index >= PP_PREMIUM_THRESHOLD) {
        target = buckets.signalCleared;
        recordOu(target, ouResult);
      } else {
        recordOu(target, ouResult);
      }
    }

    for (const official of game.officials) {
      if (official.role !== "referee") continue;
      const slug = refSlug(official.name, official.number);
      const hist = refMinorHistory.get(slug) ?? [];
      hist.push({
        totalPoints: game.totalPoints,
        totalFouls: game.totalFouls,
        homeMinors: game.homeMinors,
        awayMinors: game.awayMinors,
      });
      refMinorHistory.set(slug, hist);
    }
    priorGames.push(game);
  }

  const realLineGames = buckets.allRealLine.sampleSize;
  const bucketList = Object.values(buckets).map(finalizeBucket);
  const cleared = bucketList[0];

  return {
    signal: "NHL PP Premium",
    methodology:
      "Walk-forward: ref minor averages exclude target game and later games. " +
      "Signal when index = (refMinorRate − leagueAvgMinors) × specialTeamsEdge × 8 ≥ 0.35. " +
      "Referees only (25+ prior games). Direction: Over closing total.",
    exclusions,
    realLineGames,
    breakEvenRate: BREAK_EVEN_RATE,
    buckets: bucketList,
    summary:
      realLineGames === 0
        ? "No external-line NHL games in game logs — backtest not scored."
        : cleared.sampleSize === 0
          ? `${realLineGames} real-line games; no PP Premium signals cleared threshold.`
          : `Cleared PP Premium: ${cleared.sampleSize} bets, ${cleared.ouHitRate !== null ? (cleared.ouHitRate * 100).toFixed(1) : "n/a"}% Over hit rate, ROI ${cleared.roiPct ?? "n/a"}% at -110.`,
  };
}

function main() {
  const nbaFile = loadGameLogs("NBA");
  const nhlFile = loadGameLogs("NHL");
  const nbaGames = nbaFile?.games ?? [];
  const nhlGames = nhlFile?.games ?? [];

  const results: BacktestResults = {
    generatedAt: new Date().toISOString(),
    note:
      "Only games with lineSource=external are scored. Synthetic or missing lines are excluded — not fabricated.",
    nbaWhistlePremium: backtestNbaWhistlePremium(nbaGames),
    nhlPpPremium: backtestNhlPpPremium(nhlGames),
  };

  const outJson = path.join(process.cwd(), "data", "backtest-results.json");
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(results, null, 2)}\n`);

  const md = renderMarkdown(results);
  fs.writeFileSync(path.join(process.cwd(), "BACKTEST.md"), md);

  console.log("Backtest complete.");
  console.log(`  NBA real-line games: ${results.nbaWhistlePremium.realLineGames}`);
  console.log(`  NHL real-line games: ${results.nhlPpPremium.realLineGames}`);
  console.log(`  Written: ${outJson}, BACKTEST.md`);
  console.log(`  NBA: ${results.nbaWhistlePremium.summary}`);
  console.log(`  NHL: ${results.nhlPpPremium.summary}`);
}

function renderMarkdown(r: BacktestResults): string {
  const section = (s: SignalBacktest) => {
    const rows = s.buckets
      .map(
        (b) =>
          `| ${b.label} | ${b.sampleSize} | ${b.ouHitRate !== null ? (b.ouHitRate * 100).toFixed(1) + "%" : "—"} | ${b.atsHitRate !== null ? (b.atsHitRate * 100).toFixed(1) + "%" : "—"} | ${b.roiPct !== null ? b.roiPct + "%" : "—"} |`,
      )
      .join("\n");

    return `## ${s.signal}

${s.methodology}

**Summary:** ${s.summary}

| Exclusion | Count |
|-----------|------:|
| Synthetic / non-external lines | ${s.exclusions.syntheticLines} |
| Missing officials | ${s.exclusions.missingOfficials} |
| Insufficient prior history | ${s.exclusions.insufficientHistory} |

**Real-line games scored:** ${s.realLineGames}

| Bucket | n | O/U hit rate | ATS hit rate | ROI (-110) |
|--------|--:|-------------:|-------------:|-----------:|
${rows}

Break-even O/U rate at -110 vig: **${(s.breakEvenRate * 100).toFixed(2)}%**
`;
  };

  return `# Ref Watch backtest results

Generated: ${r.generatedAt}

${r.note}

${section(r.nbaWhistlePremium)}

${section(r.nhlPpPremium)}

## Caveats

- Signals are historical associations, not live recommendations.
- Walk-forward design prevents lookahead within ref histories; it does not account for roster, rule, or scheduling changes.
- ATS is reported where spread data exists on external-line games (NBA).
- NHL PP Premium uses season-level special-teams rates from \`team-special-teams.json\`, not walk-forward team form.
- With empty \`game-lines.json\` / NHL odds, most builds produce zero external-line games — results reflect data availability honestly.
`;
}

main();
