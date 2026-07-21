import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import {
  selectGameSlatePreviewCardInsights,
  type GameSlatePreviewPayload,
} from "@/lib/game-slate-preview";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import {
  hasUpcomingCardAssignedCrew,
  upcomingCardInsightFallback,
} from "@/lib/upcoming-card-hero-insight";

const UPCOMING_CARD_INSIGHT_LIMIT = 8;

type HeroInsightCandidate = {
  score: number;
  text: string;
};

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
      text: preview.homeBiasHeadline.trim(),
    });
  }

  return candidates;
}

function pushUniqueInsight(lines: string[], seen: Set<string>, text: string | undefined | null): void {
  const trimmed = text?.trim();
  if (!trimmed || seen.has(trimmed)) return;
  seen.add(trimmed);
  lines.push(trimmed);
}

/** Full ref-intelligence lines for upcoming game cards (no truncation). */
export function collectUpcomingCardRefInsights(game: OverviewSlateEntry): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  if (!hasUpcomingCardAssignedCrew(game)) {
    pushUniqueInsight(lines, seen, upcomingCardInsightFallback(game));
    return lines;
  }

  if (game.preview) {
    const previewInsights =
      game.previewCardInsights && game.previewCardInsights.length > 0
        ? game.previewCardInsights
        : selectGameSlatePreviewCardInsights(game.preview, UPCOMING_CARD_INSIGHT_LIMIT);
    for (const line of previewInsights) {
      pushUniqueInsight(lines, seen, line);
    }

    for (const candidate of previewHeroTrendCandidates(game.preview)) {
      pushUniqueInsight(lines, seen, candidate.text);
    }

    const evidence = buildProjectionEvidence(game.preview);
    for (const driver of [...evidence.factorsIncreasing, ...evidence.factorsReducing]) {
      pushUniqueInsight(lines, seen, driver.headline);
    }
  }

  pushUniqueInsight(lines, seen, game.matchupInsight);
  pushUniqueInsight(lines, seen, game.gameContextLine);
  pushUniqueInsight(lines, seen, game.teamContextLine);
  pushUniqueInsight(lines, seen, game.lastMeetingLine);
  pushUniqueInsight(lines, seen, game.seasonStageNote);

  if (lines.length === 0) {
    pushUniqueInsight(lines, seen, upcomingCardInsightFallback(game));
  }

  return lines;
}
