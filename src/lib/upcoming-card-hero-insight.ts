import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";

const HERO_INSIGHT_MAX_LENGTH = 72;

type HeroInsightCandidate = {
  score: number;
  text: string;
};

export function hasUpcomingCardAssignedCrew(game: OverviewSlateEntry): boolean {
  return game.crewCount > 0 && game.status !== "scheduled";
}

export function upcomingCardInsightFallback(game: OverviewSlateEntry): string {
  if (game.leagueId === "wnba") {
    return "Refs not assigned yet · Matchup data loads on click";
  }
  if (game.leagueId === "epl" || game.leagueId === "laliga") {
    return "Officials TBD · Matchup data loads on click";
  }
  return "Crews TBD · Matchup data loads on click";
}

function summarizeInsightLine(line: string, maxLength = HERO_INSIGHT_MAX_LENGTH): string {
  const trimmed = line.trim();
  if (!trimmed) return trimmed;
  const firstSentence = trimmed.split(/[.!?](?:\s|$)/)[0]?.trim() ?? trimmed;
  if (firstSentence.length <= maxLength) return firstSentence;
  return `${firstSentence.slice(0, maxLength - 1).trimEnd()}…`;
}

function previewHeroTrendCandidates(preview: GameSlatePreviewPayload): HeroInsightCandidate[] {
  const candidates: HeroInsightCandidate[] = [];

  if (preview.ouLean === "over" || preview.overRate >= 0.55) {
    candidates.push({
      score: 80 + (preview.overRate - 0.5) * 100,
      text: `Trend: High Over-Rate (${formatPct(preview.overRate)})`,
    });
  } else if (preview.ouLean === "under" || preview.overRate <= 0.45) {
    candidates.push({
      score: 75 + (0.5 - preview.overRate) * 100,
      text: `Trend: Low Over-Rate (${formatPct(preview.overRate)})`,
    });
  }

  if (preview.foulsDelta >= 1.5) {
    candidates.push({
      score: 72 + Math.min(preview.foulsDelta, 4) * 2,
      text: `Trend: High ${preview.whistleLabel} (${formatSigned(preview.foulsDelta)})`,
    });
  } else if (preview.foulsDelta <= -1.5) {
    candidates.push({
      score: 70 + Math.min(Math.abs(preview.foulsDelta), 4) * 2,
      text: `Trend: Low ${preview.whistleLabel} (${formatSigned(preview.foulsDelta)})`,
    });
  }

  if (Math.abs(preview.totalPointsDelta) >= 3) {
    const direction = preview.totalPointsDelta > 0 ? "High" : "Low";
    candidates.push({
      score: 55 + Math.min(Math.abs(preview.totalPointsDelta), 6),
      text: `Trend: ${direction} ${preview.scoringLabel} (${formatSigned(preview.totalPointsDelta)})`,
    });
  }

  if (preview.homeBiasHeadline) {
    candidates.push({
      score: 88,
      text: summarizeInsightLine(preview.homeBiasHeadline),
    });
  }

  return candidates;
}

function selectPreviewHeroInsight(preview: GameSlatePreviewPayload): string | undefined {
  if (preview.insufficientSample || preview.crew.length === 0) return undefined;
  const candidates = previewHeroTrendCandidates(preview);
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => b.score - a.score)[0]?.text;
}

/** Pick one compact hero insight for upcoming game cards. */
export function selectUpcomingCardHeroInsight(game: OverviewSlateEntry): string | undefined {
  if (!hasUpcomingCardAssignedCrew(game)) return undefined;

  if (game.preview) {
    const previewTrend = selectPreviewHeroInsight(game.preview);
    if (previewTrend) return previewTrend;
  }

  if (game.previewCardInsights?.[0]) {
    return summarizeInsightLine(game.previewCardInsights[0]);
  }

  const fallback =
    game.matchupInsight ??
    game.gameContextLine ??
    game.lastMeetingLine ??
    game.teamContextLine ??
    game.seasonStageNote;

  return fallback ? summarizeInsightLine(fallback) : undefined;
}
