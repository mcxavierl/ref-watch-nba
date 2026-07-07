import { LEAGUES, type LeagueId, type LeagueMetricCopy } from "@/lib/leagues";
import { rankScore } from "@/lib/findings-shared";
import { formatPct } from "@/lib/stats-utils";
import type { TeamRefLeaderboardEntry } from "@/lib/teamRefLeaderboards";
import type { TeamSampleRecord } from "@/lib/teamRecord";
import { winRateDeltaPoints } from "@/lib/teamRecord";
import type { RefProfile, TeamCrewSplit } from "@/lib/types";

export const TEAM_INSIGHT_MIN_GAMES = 5;

export type TeamInsightCategory = "win-record" | "scoring-tilt" | "foul-edge";

export interface TeamInsight {
  id: string;
  category: TeamInsightCategory;
  title: string;
  body: string;
  refSlug?: string;
  refName?: string;
  sampleGames: number;
}

interface ScoredCandidate extends TeamInsight {
  score: number;
  subjectKey: string;
}

export interface TeamInsightInput {
  teamAbbr: string;
  teamLabel: string;
  teamRecord: TeamSampleRecord;
  crewSplits: TeamCrewSplit[];
  refSplits: TeamRefLeaderboardEntry[];
  refs: RefProfile[];
  leagueAvgTotal: number;
  leagueOverBaseline: number;
  leagueAvgFouls: number;
  league?: LeagueId;
}

const CATEGORY_LABELS: Record<TeamInsightCategory, string> = {
  "win-record": "Win rate pattern",
  "scoring-tilt": "Scoring pattern",
  "foul-edge": "Whistle pattern",
};

function recordFromWinRate(
  games: number,
  winRate: number,
): { wins: number; losses: number } {
  const wins = Math.round(winRate * games);
  return { wins, losses: games - wins };
}

function formatCrewLabel(names: string[]): string {
  if (names.length === 0) return "this crew";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function findRefSlug(refs: RefProfile[], name: string): string | undefined {
  return refs.find((ref) => ref.name === name)?.slug;
}

function weightedFoulBaseline(refSplits: TeamRefLeaderboardEntry[]): number {
  const games = refSplits.reduce((sum, entry) => sum + entry.games, 0);
  if (games === 0) return 0;
  return (
    refSplits.reduce(
      (sum, entry) => sum + entry.avgFoulDifferential * entry.games,
      0,
    ) / games
  );
}

function winRecordScore(
  winRate: number,
  teamBaseline: number,
  games: number,
): number {
  const delta = Math.abs(winRate - teamBaseline);
  if (games < TEAM_INSIGHT_MIN_GAMES || delta < 0.1) return 0;
  const extremeBonus =
    winRate <= 0.25 || winRate >= 0.75 ? 0.08 : winRate <= 0.3 || winRate >= 0.7 ? 0.04 : 0;
  return rankScore(delta + extremeBonus, games, TEAM_INSIGHT_MIN_GAMES);
}

function scoringScore(
  overRate: number,
  avgTotal: number,
  leagueAvgTotal: number,
  games: number,
): number {
  const overDelta = Math.abs(overRate - 0.5);
  const totalDelta = Math.abs(avgTotal - leagueAvgTotal) / leagueAvgTotal;
  if (games < TEAM_INSIGHT_MIN_GAMES || (overDelta < 0.1 && totalDelta < 0.04)) {
    return 0;
  }
  return rankScore(overDelta + totalDelta * 0.35, games, TEAM_INSIGHT_MIN_GAMES);
}

function foulScore(
  foulDiff: number,
  teamBaseline: number,
  games: number,
): number {
  const delta = Math.abs(foulDiff);
  const vsTeam = Math.abs(foulDiff - teamBaseline);
  if (games < TEAM_INSIGHT_MIN_GAMES || (delta < 1.0 && vsTeam < 0.8)) return 0;
  return rankScore(Math.max(delta / 2.5, vsTeam / 2), games, TEAM_INSIGHT_MIN_GAMES);
}

function buildRefWinInsight(
  entry: TeamRefLeaderboardEntry,
  input: TeamInsightInput,
): ScoredCandidate | null {
  const score = winRecordScore(
    entry.winRate,
    input.teamRecord.winRate,
    entry.games,
  );
  if (score <= 0) return null;

  const { wins, losses } = recordFromWinRate(entry.games, entry.winRate);
  const deltaPts = winRateDeltaPoints(entry.winRate, input.teamRecord.winRate);
  const direction =
    entry.winRate >= input.teamRecord.winRate ? "above" : "below";

  return {
    id: `ref-win-${entry.slug}`,
    category: "win-record",
    title: CATEGORY_LABELS["win-record"],
    body: `When ${entry.name} officiates, ${input.teamLabel} are ${wins}-${losses} (${formatPct(entry.winRate)}) in ${entry.games} games, ${Math.abs(deltaPts).toFixed(1)} pts ${direction} their ${formatPct(input.teamRecord.winRate)} sample average.`,
    refSlug: entry.slug,
    refName: entry.name,
    sampleGames: entry.games,
    score,
    subjectKey: `ref:${entry.slug}`,
  };
}

function buildCrewWinInsight(
  split: TeamCrewSplit,
  input: TeamInsightInput,
): ScoredCandidate | null {
  const winRate = split.games > 0 ? split.wins / split.games : 0;
  const score = winRecordScore(winRate, input.teamRecord.winRate, split.games);
  if (score <= 0) return null;

  const deltaPts = winRateDeltaPoints(winRate, input.teamRecord.winRate);
  const direction = winRate >= input.teamRecord.winRate ? "above" : "below";
  const crewLabel = formatCrewLabel(split.crewNames);
  const primarySlug = findRefSlug(input.refs, split.crewNames[0] ?? "");

  return {
    id: `crew-win-${split.crewKey}`,
    category: "win-record",
    title: CATEGORY_LABELS["win-record"],
    body: `Under crews with ${crewLabel}, ${input.teamLabel} are ${split.wins}-${split.losses} (${formatPct(winRate)}) in ${split.games} games, ${Math.abs(deltaPts).toFixed(1)} pts ${direction} their ${formatPct(input.teamRecord.winRate)} sample average.`,
    refSlug: primarySlug,
    refName: split.crewNames[0],
    sampleGames: split.games,
    score,
    subjectKey: `crew:${split.crewKey}`,
  };
}

function buildRefScoringInsight(
  entry: TeamRefLeaderboardEntry,
  input: TeamInsightInput,
  metrics: LeagueMetricCopy,
): ScoredCandidate | null {
  const score = scoringScore(
    entry.overRate,
    entry.avgTotalPoints,
    input.leagueAvgTotal,
    entry.games,
  );
  if (score <= 0) return null;

  const lean = entry.overRate >= 0.5 ? "over" : "under";
  const totalDelta = entry.avgTotalPoints - input.leagueAvgTotal;

  return {
    id: `ref-scoring-${entry.slug}`,
    category: "scoring-tilt",
    title: CATEGORY_LABELS["scoring-tilt"],
    body: `In ${input.teamLabel} games with ${entry.name}, contests average ${entry.avgTotalPoints.toFixed(1)} combined ${metrics.scoreUnitPlural} (${formatSignedPlain(totalDelta)} vs league), ${formatPct(entry.overRate)} finish ${lean} the ${input.leagueOverBaseline}-${metrics.scoreUnit} benchmark across ${entry.games} games.`,
    refSlug: entry.slug,
    refName: entry.name,
    sampleGames: entry.games,
    score,
    subjectKey: `ref:${entry.slug}`,
  };
}

function buildCrewScoringInsight(
  split: TeamCrewSplit,
  input: TeamInsightInput,
  metrics: LeagueMetricCopy,
): ScoredCandidate | null {
  const score = scoringScore(
    split.overRate,
    split.avgTotalPoints,
    input.leagueAvgTotal,
    split.games,
  );
  if (score <= 0) return null;

  const lean = split.overRate >= 0.5 ? "over" : "under";
  const totalDelta = split.avgTotalPoints - input.leagueAvgTotal;
  const crewLabel = formatCrewLabel(split.crewNames);
  const primarySlug = findRefSlug(input.refs, split.crewNames[0] ?? "");

  return {
    id: `crew-scoring-${split.crewKey}`,
    category: "scoring-tilt",
    title: CATEGORY_LABELS["scoring-tilt"],
    body: `When ${crewLabel} work together on ${input.teamLabel} games, contests average ${split.avgTotalPoints.toFixed(1)} combined ${metrics.scoreUnitPlural} (${formatSignedPlain(totalDelta)} vs league), ${formatPct(split.overRate)} finish ${lean} the ${input.leagueOverBaseline}-${metrics.scoreUnit} benchmark across ${split.games} games.`,
    refSlug: primarySlug,
    refName: split.crewNames[0],
    sampleGames: split.games,
    score,
    subjectKey: `crew:${split.crewKey}`,
  };
}

function buildRefFoulInsight(
  entry: TeamRefLeaderboardEntry,
  input: TeamInsightInput,
  teamFoulBaseline: number,
  metrics: LeagueMetricCopy,
): ScoredCandidate | null {
  const score = foulScore(
    entry.avgFoulDifferential,
    teamFoulBaseline,
    entry.games,
  );
  if (score <= 0) return null;

  const favored =
    entry.avgFoulDifferential >= 0 ? input.teamLabel : "opponents";
  const disadvantaged =
    entry.avgFoulDifferential >= 0 ? "opponents" : input.teamLabel;

  return {
    id: `ref-foul-${entry.slug}`,
    category: "foul-edge",
    title: CATEGORY_LABELS["foul-edge"],
    body: `In ${input.teamLabel} games with ${entry.name}, ${favored} draw ${Math.abs(entry.avgFoulDifferential).toFixed(1)} more ${metrics.whistlePlain} per game than ${disadvantaged} (${entry.games}-game sample).`,
    refSlug: entry.slug,
    refName: entry.name,
    sampleGames: entry.games,
    score,
    subjectKey: `ref:${entry.slug}`,
  };
}

function buildCrewFoulInsight(
  split: TeamCrewSplit,
  input: TeamInsightInput,
  teamFoulBaseline: number,
  metrics: LeagueMetricCopy,
): ScoredCandidate | null {
  const score = foulScore(split.foulDifferential, teamFoulBaseline, split.games);
  if (score <= 0) return null;

  const favored =
    split.foulDifferential >= 0 ? input.teamLabel : "opponents";
  const disadvantaged =
    split.foulDifferential >= 0 ? "opponents" : input.teamLabel;
  const crewLabel = formatCrewLabel(split.crewNames);
  const primarySlug = findRefSlug(input.refs, split.crewNames[0] ?? "");

  return {
    id: `crew-foul-${split.crewKey}`,
    category: "foul-edge",
    title: CATEGORY_LABELS["foul-edge"],
    body: `Crews with ${crewLabel} whistle ${favored} ${Math.abs(split.foulDifferential).toFixed(1)} more ${metrics.whistlePlain} per game than ${disadvantaged} in ${input.teamLabel} matchups (${split.games} games).`,
    refSlug: primarySlug,
    refName: split.crewNames[0],
    sampleGames: split.games,
    score,
    subjectKey: `crew:${split.crewKey}`,
  };
}

function formatSignedPlain(n: number): string {
  const formatted = n.toFixed(1);
  return n >= 0 ? `+${formatted}` : formatted;
}

function pickTopInsights(candidates: ScoredCandidate[], limit = 2): TeamInsight[] {
  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  const picked: ScoredCandidate[] = [];
  const usedSubjects = new Set<string>();
  const usedCategories = new Set<TeamInsightCategory>();

  for (const candidate of ranked) {
    if (picked.length >= limit) break;
    if (usedSubjects.has(candidate.subjectKey)) continue;

    if (
      picked.length === 1 &&
      usedCategories.has(candidate.category) &&
      ranked.some(
        (alt) =>
          alt.score > 0 &&
          !usedSubjects.has(alt.subjectKey) &&
          !usedCategories.has(alt.category),
      )
    ) {
      continue;
    }

    picked.push(candidate);
    usedSubjects.add(candidate.subjectKey);
    usedCategories.add(candidate.category);
  }

  if (picked.length < limit) {
    for (const candidate of ranked) {
      if (picked.length >= limit) break;
      if (usedSubjects.has(candidate.subjectKey)) continue;
      picked.push(candidate);
      usedSubjects.add(candidate.subjectKey);
    }
  }

  return picked.map((candidate) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip scoring fields
    const { score, subjectKey, ...insight } = candidate;
    return insight;
  });
}

export function computeTeamInsights(input: TeamInsightInput): TeamInsight[] {
  const league = input.league ?? "nba";
  const metrics = LEAGUES[league].metrics;
  const teamFoulBaseline = weightedFoulBaseline(input.refSplits);
  const candidates: ScoredCandidate[] = [];

  for (const entry of input.refSplits) {
    if (entry.games < TEAM_INSIGHT_MIN_GAMES) continue;
    const win = buildRefWinInsight(entry, input);
    const scoring = buildRefScoringInsight(entry, input, metrics);
    const foul = buildRefFoulInsight(entry, input, teamFoulBaseline, metrics);
    if (win) candidates.push(win);
    if (scoring) candidates.push(scoring);
    if (foul) candidates.push(foul);
  }

  for (const split of input.crewSplits) {
    if (split.games < TEAM_INSIGHT_MIN_GAMES) continue;
    const win = buildCrewWinInsight(split, input);
    const scoring = buildCrewScoringInsight(split, input, metrics);
    const foul = buildCrewFoulInsight(split, input, teamFoulBaseline, metrics);
    if (win) candidates.push(win);
    if (scoring) candidates.push(scoring);
    if (foul) candidates.push(foul);
  }

  return pickTopInsights(candidates, 2);
}
