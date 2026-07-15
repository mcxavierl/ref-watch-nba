import {
  Activity,
  Flag,
  Home,
  LineChart,
  Percent,
  Scale,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Whistle } from "@/components/icons/Whistle";
import { statValueDelightTone } from "@/lib/metric-delight";
import type { RankingsInsight } from "@/lib/rankings-synthesis";

export type HighlightCardTone = "positive" | "negative" | "neutral";

/** Soft accent used for icon wells and card glow (independent of metric sign). */
export type HighlightCardAccent =
  | "scoring"
  | "over"
  | "ats"
  | "ou"
  | "whistle"
  | "flags"
  | "leverage"
  | "balance"
  | "default";

const INSIGHT_ACCENT: Record<string, HighlightCardAccent> = {
  "top-scoring": "scoring",
  "top-over": "over",
  "top-ats": "ats",
  "top-ou-betting": "ou",
  "top-whistle": "whistle",
};

const LEADER_CATEGORY_ACCENT: Record<string, HighlightCardAccent> = {
  scoring: "scoring",
  overRate: "over",
  flags: "flags",
  fouls: "flags",
  yellowCards: "flags",
  penalties: "flags",
  penaltyYards: "flags",
  leverageImpact: "leverage",
  balance: "balance",
};

const INSIGHT_ICONS: Record<string, LucideIcon> = {
  "top-scoring": TrendingUp,
  "top-over": Percent,
  "top-ats": Home,
  "top-ou-betting": LineChart,
  "top-whistle": Whistle,
};

const LEADER_CATEGORY_ICONS: Record<string, LucideIcon> = {
  scoring: TrendingUp,
  overRate: Percent,
  flags: Flag,
  fouls: Flag,
  yellowCards: Flag,
  penalties: Flag,
  penaltyYards: Flag,
  leverageImpact: Zap,
  balance: Scale,
};

function toneFromStatValue(statValue?: string): HighlightCardTone {
  if (!statValue) return "neutral";
  const delight = statValueDelightTone(statValue);
  if (delight === "positive" || delight === "standout-high") return "positive";
  if (delight === "negative" || delight === "standout-low") return "negative";
  return "neutral";
}

export function rankingsInsightCardTone(insight: RankingsInsight): HighlightCardTone {
  if (
    insight.id === "top-over" ||
    insight.id === "top-ats" ||
    insight.id === "top-ou-betting"
  ) {
    return "positive";
  }
  return toneFromStatValue(insight.statValue);
}

export function leaderHighlightTone(
  category: string,
  value?: string,
  delta?: number,
): HighlightCardTone {
  if (delta !== undefined) {
    if (delta > 0.05) return "positive";
    if (delta < -0.05) return "negative";
  }
  return toneFromStatValue(value);
}

export function highlightCardAccentForInsight(insightId: string): HighlightCardAccent {
  return INSIGHT_ACCENT[insightId] ?? "default";
}

export function highlightCardAccentForLeaderCategory(
  category: string,
): HighlightCardAccent {
  return LEADER_CATEGORY_ACCENT[category] ?? "default";
}

export function highlightCardIconForInsight(insightId: string): LucideIcon {
  return INSIGHT_ICONS[insightId] ?? Activity;
}

export function highlightCardIconForLeaderCategory(category: string): LucideIcon {
  return LEADER_CATEGORY_ICONS[category] ?? Activity;
}
