import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import {
  hasUpcomingCardAssignedCrew,
  selectUpcomingCardHeroInsight,
  upcomingCardInsightFallback,
} from "@/lib/upcoming-card-hero-insight";

export type UpcomingCardSignalTone = "positive" | "caution" | "neutral";

export type UpcomingCardSignals = {
  primaryTrend: string;
  tone: UpcomingCardSignalTone;
};

function whistleTrend(preview: GameSlatePreviewPayload): UpcomingCardSignals | null {
  if (Math.abs(preview.foulsDelta) < 1) return null;
  const tone: UpcomingCardSignalTone =
    preview.foulsDelta >= 1.5 ? "caution" : preview.foulsDelta <= -1.5 ? "positive" : "neutral";
  return {
    primaryTrend: `${formatSigned(preview.foulsDelta)} ${preview.whistleLabel} vs crew baseline`,
    tone,
  };
}

function overRateTrend(preview: GameSlatePreviewPayload): UpcomingCardSignals | null {
  if (preview.overRate < 0.58 && preview.overRate > 0.42) return null;
  return {
    primaryTrend: `${formatPct(preview.overRate)} over rate with this crew`,
    tone: preview.overRate >= 0.58 ? "positive" : "neutral",
  };
}

function scoringTrend(preview: GameSlatePreviewPayload): UpcomingCardSignals | null {
  if (Math.abs(preview.totalPointsDelta) < 2) return null;
  const tone: UpcomingCardSignalTone =
    Math.abs(preview.totalPointsDelta) >= 4 ? "caution" : "neutral";
  return {
    primaryTrend: `${formatSigned(preview.totalPointsDelta)} ${preview.scoringLabel} vs baseline`,
    tone,
  };
}

function selectPrimaryTrend(
  game: OverviewSlateEntry,
  preview?: GameSlatePreviewPayload,
): UpcomingCardSignals {
  if (preview && hasUpcomingCardAssignedCrew(game)) {
    const ranked = [whistleTrend(preview), overRateTrend(preview), scoringTrend(preview)].filter(
      (row): row is UpcomingCardSignals => row !== null,
    );
    if (ranked[0]) return ranked[0];
  }

  const hero =
    selectUpcomingCardHeroInsight(game) ??
    upcomingCardInsightFallback(game).split(" · ")[0] ??
    "Matchup intelligence on click";

  return {
    primaryTrend: hero,
    tone: "neutral",
  };
}

export function buildUpcomingCardSignals(game: OverviewSlateEntry): UpcomingCardSignals {
  return selectPrimaryTrend(game, game.preview);
}
